import { createHmac, timingSafeEqual } from 'node:crypto';

export type Session = {
  subject: string;
  authentication: 'guest' | 'apple';
  expiresAt: Date;
};

type JwtClaims = {
  sub: string;
  auth: Session['authentication'];
  exp: number;
};

export class JwtSessionCodec {
  public constructor(private readonly secret: string) {}

  public issue(
    subject: string,
    authentication: Session['authentication'],
    expiresAt: Date,
  ): string {
    const header = encode({ alg: 'HS256', typ: 'JWT' });
    const payload = encode({
      sub: subject,
      auth: authentication,
      exp: Math.floor(expiresAt.getTime() / 1000),
    } satisfies JwtClaims);
    const signingInput = `${header}.${payload}`;

    return `${signingInput}.${this.sign(signingInput)}`;
  }

  public verify(token: string, now = new Date()): Session | undefined {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return undefined;
    }

    const [header, payload, signature] = parts;
    if (
      !header ||
      !payload ||
      !signature ||
      !this.hasValidSignature(`${header}.${payload}`, signature)
    ) {
      return undefined;
    }

    const claims = decodeClaims(payload);
    if (!claims || claims.exp * 1000 <= now.getTime()) {
      return undefined;
    }

    return {
      subject: claims.sub,
      authentication: claims.auth,
      expiresAt: new Date(claims.exp * 1000),
    };
  }

  private sign(value: string): string {
    return createHmac('sha256', this.secret).update(value).digest('base64url');
  }

  private hasValidSignature(value: string, signature: string): boolean {
    const expected = Buffer.from(this.sign(value));
    const received = Buffer.from(signature);

    return expected.length === received.length && timingSafeEqual(expected, received);
  }
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decodeClaims(payload: string): JwtClaims | undefined {
  try {
    const value: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (
      !isRecord(value) ||
      typeof value.sub !== 'string' ||
      !value.sub ||
      (value.auth !== 'guest' && value.auth !== 'apple') ||
      typeof value.exp !== 'number' ||
      !Number.isFinite(value.exp)
    ) {
      return undefined;
    }

    return { sub: value.sub, auth: value.auth, exp: value.exp };
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

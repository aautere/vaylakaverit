import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Action, Card, StatusMessage, TextField } from './index';

describe('UI foundation', () => {
  it('renders a token-backed primary action with safe button semantics', () => {
    const markup = renderToStaticMarkup(<Action disabled>Save score</Action>);

    expect(markup).toContain('class="ui-action ui-action--primary"');
    expect(markup).toContain('type="button"');
    expect(markup).toContain('disabled=""');
  });

  it('connects field labels, help, and errors to the control', () => {
    const markup = renderToStaticMarkup(
      <TextField
        error="Enter a valid handicap."
        hint="Use your current handicap index."
        id="handicap"
        label="Handicap index"
      />,
    );

    expect(markup).toContain(
      '<label class="ui-field__label" for="handicap">Handicap index</label>',
    );
    expect(markup).toContain('aria-describedby="handicap-hint handicap-error"');
    expect(markup).toContain('aria-invalid="true"');
  });

  it('uses appropriate live semantics for status messages', () => {
    const errorMarkup = renderToStaticMarkup(
      <StatusMessage tone="error">Score could not be saved.</StatusMessage>,
    );
    const infoMarkup = renderToStaticMarkup(
      <StatusMessage tone="info">Score is waiting to sync.</StatusMessage>,
    );

    expect(errorMarkup).toContain('role="alert"');
    expect(errorMarkup).toContain('aria-live="assertive"');
    expect(infoMarkup).toContain('role="status"');
    expect(infoMarkup).toContain('aria-live="polite"');
  });

  it('uses stable semantic classes for cards and controls', () => {
    const markup = renderToStaticMarkup(<Card>Round details</Card>);
    const actionMarkup = renderToStaticMarkup(<Action>Save score</Action>);

    expect(markup).toContain('class="ui-card"');
    expect(actionMarkup).toContain('class="ui-action ui-action--primary"');
  });
});

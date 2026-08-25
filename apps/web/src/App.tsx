import { useState } from 'react';

const actions = [
  {
    title: 'Aloita kierros',
    description: 'Luo yhteinen peli ja kutsu kaverit QR-koodilla.',
    label: 'Luo kierros',
  },
  {
    title: 'Liity kierrokseen',
    description: 'Skannaa kaverin QR-koodi ja kirjaa oma tuloksesi.',
    label: 'Skannaa QR-koodi',
  },
] as const;

function App() {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col bg-[#f7f8f4] px-5 pb-8 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-[#386354]">VÄYLÄKAVERIT</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#073b2d]">
            Pelaa kierros yhdessä.
          </h1>
        </div>
        <span
          aria-label="Esikatselutila"
          className="rounded-full bg-[#e6efe8] px-3 py-1 text-xs font-semibold text-[#245642]"
        >
          Esikatselu
        </span>
      </header>

      <section className="mt-10 rounded-3xl bg-[#073b2d] p-6 text-white shadow-lg shadow-[#073b2d]/15">
        <p className="text-sm font-semibold text-[#d4e5d9]">SEURAAVA KIERROS</p>
        <h2 className="mt-3 text-2xl font-bold">Kaveripelin kaikki tilanteet yhdessä paikassa.</h2>
        <p className="mt-3 text-base leading-7 text-[#d4e5d9]">
          Reikäpeli, sivupelit ja tulokset päivittyvät koko porukalle heti.
        </p>
      </section>

      <section aria-label="Kierroksen toiminnot" className="mt-7 grid gap-4">
        {actions.map((action) => (
          <article
            key={action.title}
            className="rounded-3xl border border-[#d8e2d8] bg-white p-5 shadow-sm"
          >
            <h2 className="text-xl font-bold text-[#073b2d]">{action.title}</h2>
            <p className="mt-2 leading-6 text-[#476257]">{action.description}</p>
            <button
              type="button"
              className="mt-5 min-h-12 w-full rounded-2xl bg-[#e5b700] px-4 py-3 font-bold text-[#17231c] transition hover:bg-[#f1c824]"
              onClick={() =>
                setNotice('Tämä toiminto yhdistetään seuraavaksi Väyläkavereiden API:in.')
              }
            >
              {action.label}
            </button>
          </article>
        ))}
      </section>

      {notice ? (
        <p
          role="status"
          className="mt-5 rounded-2xl bg-[#e6efe8] px-4 py-3 text-sm font-medium text-[#245642]"
        >
          {notice}
        </p>
      ) : null}

      <footer className="mt-auto pt-10 text-center text-sm text-[#62776c]">
        Ensimmäinen kenttä: Golf Talma Master
      </footer>
    </main>
  );
}

export default App;

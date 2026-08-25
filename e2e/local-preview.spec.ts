import { devices, expect, test } from '@playwright/test';

test('two iPhone-sized participants join locally, settle a side-game tie, correct it, and review history', async ({
  browser,
  request,
}) => {
  await expect
    .poll(
      async () => {
        try {
          const response = await request.get('http://127.0.0.1:7071/api/health');
          return response.ok();
        } catch {
          return false;
        }
      },
      { timeout: 60_000 },
    )
    .toBe(true);

  const creatorContext = await browser.newContext({
    ...devices['iPhone 13'],
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const joinerContext = await browser.newContext({ ...devices['iPhone 13'] });
  const creator = await creatorContext.newPage();
  const joiner = await joinerContext.newPage();

  try {
    await creator.goto('/');
    await creator.locator('#player-name').fill('Aino');
    await creator.getByRole('button', { name: 'Luo kierros' }).click();
    await expect(creator.getByRole('heading', { name: 'Kierroksen aula' })).toBeVisible();

    await creator.getByRole('button', { name: 'Kopioi liittymislinkki' }).click();
    await expect(creator.getByRole('button', { name: 'Liittymislinkki kopioitu' })).toBeVisible();
    const joinLink = await creator.evaluate(() => navigator.clipboard.readText());
    expect(new URL(joinLink).searchParams.get('join')).toBeTruthy();

    await joiner.goto(joinLink);
    await joiner.locator('#player-name').fill('Sanni');
    await joiner.getByRole('button', { name: 'Liity kierrokseen' }).click();
    await expect(joiner.getByRole('heading', { name: 'Kierroksen aula' })).toBeVisible();
    await joiner.getByRole('button', { name: 'Vahvista asetukset valmiiksi' }).click();
    await expect(creator.getByText('2 / 4 pelaajaa')).toBeVisible();
    await creator.getByRole('button', { name: 'Vahvista asetukset valmiiksi' }).click();
    await creator.getByRole('button', { name: 'Aloita kierros' }).click();
    await expect(creator.getByRole('heading', { name: 'Kierros käynnissä.' })).toBeVisible();
    await expect(joiner.getByRole('heading', { name: 'Kierros käynnissä.' })).toBeVisible();

    await creator.locator('#side-game-holes').fill('1');
    await creator.locator('#side-game-reward').fill('Kahvit');
    await creator.getByRole('checkbox', { name: 'Aino' }).check();
    await creator.getByRole('checkbox', { name: 'Sanni' }).check();
    await creator.getByRole('button', { name: 'Aloita sivupeli' }).click();
    await expect(creator.getByText('Palkinto: Kahvit')).toBeVisible();

    await creator.locator('#strokes').fill('4');
    await creator.getByRole('button', { name: 'Tallenna tulos' }).click();
    await expect(creator.getByText('0 reikää', { exact: true })).toBeVisible();

    await joiner.locator('#strokes').fill('4');
    await joiner.getByRole('button', { name: 'Tallenna tulos' }).click();

    await expect(creator.getByText('1 reikää', { exact: true })).toBeVisible();
    await expect(creator.getByText('Reikä 1: tasatulos').first()).toBeVisible();
    await expect(creator.getByText('Tasapeli').last()).toBeVisible();

    await creatorContext.setOffline(true);
    await creator.locator('#strokes').fill('3');
    await creator.getByRole('button', { name: 'Tallenna tulos' }).click();
    await expect(creator.getByText('1 tulos odottaa tallennusta.')).toBeVisible();
    await creatorContext.setOffline(false);
    await creator.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(creator.getByText('Aino voitti').last()).toBeVisible();
    await expect(creator.getByText('tulos odottaa tallennusta')).not.toBeVisible();

    await creator.getByRole('button', { name: 'Päätä kierros' }).click();
    await expect(creator.getByRole('heading', { name: 'Kierroksen historia' })).toBeVisible();
    await expect(creator.getByText('Kierros päättyi')).toBeVisible();
    await expect(creator.getByText('Palkinto: Kahvit')).toBeVisible();
    await expect(creator.getByText('Reikä 1: 3 lyöntiä')).toBeVisible();
  } finally {
    await creatorContext.close();
    await joinerContext.close();
  }
});

test('a local guest can confirm deletion of their data', async ({ page }) => {
  await page.goto('/');
  await page.locator('#player-name').fill('Poistettava pelaaja');
  await page.getByRole('button', { name: 'Luo kierros' }).click();
  await expect(page.getByRole('heading', { name: 'Kierroksen aula' })).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Poista tietoni' }).click();

  await expect(page.getByRole('status')).toContainText('Tietosi on poistettu');
  await expect(page.getByRole('heading', { name: 'Pelaa kierros yhdessä.' })).toBeVisible();
});

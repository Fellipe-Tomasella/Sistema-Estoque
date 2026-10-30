import { expect, test as setup } from '@playwright/test'
import { E2E_USER } from './api'

/** Login: senha errada mostra a mensagem; a certa entra no Início. A sessão fica salva para os outros testes. */
setup('login', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(E2E_USER.email)
  await page.getByLabel('Senha', { exact: true }).fill('senha-errada')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByText(/e-mail ou senha/i)).toBeVisible()

  await page.getByLabel('Senha', { exact: true }).fill(E2E_USER.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL('/')
  await page.context().storageState({ path: 'e2e/.auth/state.json' })
})

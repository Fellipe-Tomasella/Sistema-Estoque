import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ApiError, client, unwrap } from '@/lib/api'
import { queryClient } from '@/lib/query'

interface User {
  id: string
  name: string
  email: string
}

/** Sessão da usuária. O cookie é HttpOnly: o front só sabe quem está logada perguntando à API. */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const checked = ref(false)

  async function loadSession() {
    try {
      user.value = (await unwrap(client.auth.me.get())).user
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) throw error
      user.value = null
    } finally {
      checked.value = true
    }
    return user.value
  }

  async function login(email: string, password: string) {
    user.value = (await unwrap(client.auth.login.post({ email, password }))).user
    checked.value = true
  }

  async function logout(everywhere = false) {
    await unwrap(everywhere ? client.auth['logout-all'].post() : client.auth.logout.post())
    user.value = null
    queryClient.clear()
  }

  return { user, checked, loadSession, login, logout }
})

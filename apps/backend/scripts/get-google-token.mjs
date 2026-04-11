/**
 * Script one-shot pour générer le GOOGLE_REFRESH_TOKEN
 * Usage: node apps/backend/scripts/get-google-token.mjs
 */
import { createServer } from 'http'
import { google } from 'googleapis'

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET doivent être définis dans apps/backend/.env')
  process.exit(1)
}
const REDIRECT_URI = 'http://localhost:4242/oauth2callback'

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // Force le refresh_token même si déjà autorisé
  scope: ['https://www.googleapis.com/auth/calendar'],
})

console.log('\n✅ Ouvre cette URL dans ton navigateur :\n')
console.log(authUrl)
console.log('\n⏳ En attente du callback sur http://localhost:4242...\n')

// Serveur local pour récupérer le code OAuth
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:4242')
  if (url.pathname !== '/oauth2callback') return

  const code = url.searchParams.get('code')
  if (!code) {
    res.end('Erreur: pas de code dans la réponse')
    return
  }

  try {
    const { tokens } = await oauth2Client.getToken(code)

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end('<h2>✅ Authentification réussie ! Tu peux fermer cet onglet.</h2>')

    console.log('\n🎉 Refresh token obtenu ! Ajoute cette ligne dans apps/backend/.env :\n')
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`)
    console.log('')

    server.close()
  } catch (err) {
    res.end(`Erreur: ${err.message}`)
    console.error(err)
    server.close()
  }
})

server.listen(4242)

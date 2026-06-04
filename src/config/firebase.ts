import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyDoGlRTvE0gEQ5j4OfKnNWZ-ileJgh3qFc',
  authDomain: 'rapidfx.firebaseapp.com',
  projectId: 'rapidfx',
  storageBucket: 'rapidfx.firebasestorage.app',
  messagingSenderId: '18758290137',
  appId: '1:18758290137:web:7bcf944286d3a5a9244cc8',
  measurementId: 'G-4H69KSNVPS',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

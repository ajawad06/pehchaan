import { db } from '../firebase'
import {
  collection, doc, setDoc, addDoc, serverTimestamp, updateDoc,
  getDoc, getDocs, query, where, orderBy, limit
} from 'firebase/firestore'

export const createUserRecord = async (userId, ageBand) => {
  await setDoc(doc(db, 'users', userId), {
    age_band: ageBand,
    created_at: serverTimestamp()
  }, { merge: true })
}

export const createSession = async (userId) => {
  const sessionRef = doc(collection(db, 'sessions'))
  await setDoc(sessionRef, {
    user_id: userId,
    start_time: serverTimestamp(),
    completion_status: 'in_progress',
    activities_completed: []
  })
  return sessionRef.id
}

export const recordResponse = async (sessionId, activityId, data) => {
  const respRef = collection(db, 'responses')
  await addDoc(respRef, {
    session_id: sessionId,
    activity_id: activityId,
    timestamp: serverTimestamp(),
    ...data
  })
}

export const updateSessionProgress = async (sessionId, activityId) => {
  // In a real app we'd use arrayUnion, but this is simple enough
  const sessionRef = doc(db, 'sessions', sessionId)
  // We're keeping it simple for the MVP, frontend tracks state, we just log it
  await setDoc(sessionRef, {
    last_activity: activityId,
    updated_at: serverTimestamp()
  }, { merge: true })
}

export const saveTraitVector = async (sessionId, traits) => {
  const vecRef = doc(db, 'trait_vectors', sessionId)
  await setDoc(vecRef, {
    ...traits,
    version: '1.0',
    computed_at: serverTimestamp()
  })
}

export const saveRecommendations = async (sessionId, recommendations, modelVersion) => {
  const recRef = doc(db, 'recommendations', sessionId)
  await setDoc(recRef, {
    ranked_clusters: recommendations,
    model_version: modelVersion,
    generated_at: serverTimestamp()
  })
}

/* ---------------------------------------------------------------------
   DASHBOARD READS (added for Phase 2 of the games-not-quizzes rebuild)
   These are NEW — nothing previously read the users/{uid} doc back,
   and there was no query for a user's past sessions. Flagged here
   rather than silently assumed.
--------------------------------------------------------------------- */

// Reads the users/{uid} doc written by createUserRecord (age_band, created_at).
// NEW FIELD: display_name — doesn't exist yet anywhere in the schema; Dashboard
// writes it the first time a user sets a name via updateDisplayName below.
export const getUserRecord = async (userId) => {
  const userRef = doc(db, 'users', userId)
  const snap = await getDoc(userRef)
  return snap.exists() ? snap.data() : null
}

// NEW WRITE: adds display_name to the existing users/{uid} doc, merged so
// age_band/created_at are untouched.
export const updateDisplayName = async (userId, displayName) => {
  const userRef = doc(db, 'users', userId)
  await setDoc(userRef, { display_name: displayName }, { merge: true })
}

// Reads a user's past sessions from the existing `sessions` collection
// (previously write-only — nothing queried it back). Used to build the
// Dashboard's "games completed" count and recent-activity list.
export const getUserSessions = async (userId, max = 20) => {
  const sessionsRef = collection(db, 'sessions')
  const q = query(
    sessionsRef,
    where('user_id', '==', userId),
    orderBy('start_time', 'desc'),
    limit(max)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

import { db } from '../firebase'
import { collection, doc, setDoc, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore'

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

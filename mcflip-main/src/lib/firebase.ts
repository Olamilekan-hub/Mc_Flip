// firebaseConfig.ts

// Import Firebase modules for authentication and Firestore database
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, query, where, getDocs, CollectionReference, collection } from "firebase/firestore";

// Firebase configuration object, using environment variables for security
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);
// Initialize Firebase Authentication
export const auth = getAuth(app);
// Initialize Firestore database
export const db = getFirestore(app);

// Reference to users collection in Firestore
type UserData = { username: string; email: string; createdAt: Date };
const usersCollection = collection(db, "users") as CollectionReference<UserData>;

/**
 * Registers a new user in Firebase Authentication and stores additional user data in Firestore.
 * @param {string} username - The username chosen by the user.
 * @param {string} email - The user's email address.
 * @param {string} password - The user's password.
 * @returns {Promise<Object>} - The created user object.
 */
export async function registerUser(username: string, email: string, password: string) {
  // Create user in Firebase Authentication
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Store additional user information in Firestore
  await setDoc(doc(usersCollection, user.uid), { username, email: user.email, createdAt: new Date() });
  return user;
}

/**
 * Logs in a user using their username by first fetching the associated email from Firestore.
 * @param {string} username - The username provided by the user.
 * @param {string} password - The user's password.
 * @returns {Promise<Object>} - The authenticated user object.
 * @throws {Error} - If the username is not found.
 */
export async function loginUser(username: string, password: string) {
  // Query Firestore to find the user's email by their username
  const userQuery = query(usersCollection, where("username", "==", username));
  const querySnapshot = await getDocs(userQuery);
  
  if (!querySnapshot || querySnapshot.empty) {
    throw new Error("User not found");
  }

  // Retrieve the first matched user's email
  const userData = querySnapshot.docs[0]?.data();
  if (!userData) {
    throw new Error("User data is missing");
  }
  
  const email = userData.email;
  
  // Authenticate the user using the retrieved email and password
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;

  console.log("Firebase Config:", firebaseConfig);

}

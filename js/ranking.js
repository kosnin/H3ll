// Ranking module - Firebase Firestore integration for online leaderboard
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, getCountFromServer, where } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// ========================================
// ★ Firebase設定情報をここに入力してください ★
// Firebase Console → プロジェクト設定 → ウェブアプリ → Firebase SDK snippet
// ========================================
const firebaseConfig = {
    apiKey: "AIzaSyCgw3TQlUJWooIowgOi71dHYZ4fa4lrB8o",
    authDomain: "h3ll-35cca.firebaseapp.com",
    projectId: "h3ll-35cca",
    storageBucket: "h3ll-35cca.firebasestorage.app",
    messagingSenderId: "352665972995",
    appId: "1:352665972995:web:b46ebb4a90b5754efff936",
    measurementId: "G-XZY48KLR4Y"
};

let db = null;
let analytics = null;
let initialized = false;

function init() {
    if (initialized) return;
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        analytics = getAnalytics(app); 
        initialized = true;
    } catch (e) {
        console.warn('Firebase initialization failed:', e);
    }
}

// スコアをランキングに登録
export async function addScore(name, score) {
    init();
    if (!db) return false;
    try {
        await addDoc(collection(db, 'ranking'), {
            name: name,
            score: score,
            timestamp: Date.now()
        });
        return true;
    } catch (e) {
        console.error('Failed to add score:', e);
        return false;
    }
}

// ランキング上位20件を取得
export async function getRanking() {
    init();
    if (!db) return [];
    try {
        const q = query(
            collection(db, 'ranking'),
            orderBy('score', 'desc'),
            limit(20)
        );
        const snapshot = await getDocs(q);
        const results = [];
        snapshot.forEach(doc => {
            results.push(doc.data());
        });
        return results;
    } catch (e) {
        console.error('Failed to get ranking:', e);
        return [];
    }
}

// 特定のスコアの正確な順位を取得 (自分よりスコアが高いレコード数 + 1)
export async function getExactRank(score) {
    init();
    if (!db) return -1;
    try {
        const q = query(
            collection(db, 'ranking'),
            where('score', '>', score)
        );
        const snapshot = await getCountFromServer(q);
        return snapshot.data().count + 1;
    } catch (e) {
        console.error('Failed to get exact rank:', e);
        return -1;
    }
}

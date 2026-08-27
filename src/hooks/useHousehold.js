import { useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";

export const DEFAULT_CATEGORIES = [
  "Alimentação",
  "Transporte",
  "Moradia",
  "Lazer",
  "Saúde",
  "Salário",
  "Outros",
];

// Cada "caderno" (household) tem um dono, uma lista de membros e categorias.
// O ID do caderno é usado como código de convite.
export function useHousehold(user) {
  const [householdId, setHouseholdId] = useState(null);
  const [members, setMembers] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setHouseholdId(null);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists() && userSnap.data().householdId) {
          const hid = userSnap.data().householdId;
          setHouseholdId(hid);
          const hSnap = await getDoc(doc(db, "households", hid));
          if (hSnap.exists()) {
            setMembers(hSnap.data().members || []);
            setCategories(hSnap.data().categories || DEFAULT_CATEGORIES);
          }
        } else {
          const newHouseholdId = user.uid;
          await setDoc(doc(db, "households", newHouseholdId), {
            ownerId: user.uid,
            members: [user.uid],
            categories: DEFAULT_CATEGORIES,
            createdAt: Date.now(),
          });
          await setDoc(
            userRef,
            {
              email: user.email,
              name: user.displayName,
              householdId: newHouseholdId,
            },
            { merge: true }
          );
          setHouseholdId(newHouseholdId);
          setMembers([user.uid]);
          setCategories(DEFAULT_CATEGORIES);
        }
      } catch (err) {
        console.error(err);
        setError("Não foi possível carregar seu caderno.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const joinHousehold = useCallback(
    async (code) => {
      if (!user || !code.trim()) return { ok: false, message: "Código vazio." };
      const targetId = code.trim();
      try {
        const targetRef = doc(db, "households", targetId);
        const targetSnap = await getDoc(targetRef);
        if (!targetSnap.exists()) {
          return { ok: false, message: "Código não encontrado." };
        }
        await updateDoc(targetRef, {
          members: arrayUnion(user.uid),
        });
        await setDoc(
          doc(db, "users", user.uid),
          { householdId: targetId },
          { merge: true }
        );
        setHouseholdId(targetId);
        setMembers([...(targetSnap.data().members || []), user.uid]);
        setCategories(targetSnap.data().categories || DEFAULT_CATEGORIES);
        return { ok: true };
      } catch (err) {
        console.error(err);
        return { ok: false, message: "Não foi possível entrar com esse código." };
      }
    },
    [user]
  );

  const addCategory = useCallback(
    async (name) => {
      const clean = name.trim();
      if (!clean || !householdId) return;
      if (categories.some((c) => c.toLowerCase() === clean.toLowerCase())) return;
      try {
        await updateDoc(doc(db, "households", householdId), {
          categories: arrayUnion(clean),
        });
        setCategories((prev) => [...prev, clean]);
      } catch (err) {
        console.error(err);
      }
    },
    [householdId, categories]
  );

  return { householdId, members, categories, loading, error, joinHousehold, addCategory };
}

import { useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import {
  doc,
  collection,
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

function activeStorageKey(uid) {
  return `cdc-active-household-${uid}`;
}

// Cada "caderno" (household) tem um dono, uma lista de membros e categorias.
// Uma pessoa pode pertencer a vários cadernos (um compartilhado com o parceiro,
// outro só dela, etc). O ID do caderno é usado como código de convite.
export function useHousehold(user) {
  const [households, setHouseholds] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setHouseholds([]);
      setActiveId(null);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : {};

        let ids = userData.householdIds;
        if (!ids || ids.length === 0) {
          if (userData.householdId) {
            ids = [userData.householdId];
            await setDoc(userRef, { householdIds: ids }, { merge: true });
          } else {
            const newId = user.uid;
            await setDoc(doc(db, "households", newId), {
              ownerId: user.uid,
              name: "Meu caderno",
              members: [user.uid],
              categories: DEFAULT_CATEGORIES,
              createdAt: Date.now(),
            });
            ids = [newId];
            await setDoc(
              userRef,
              {
                email: user.email,
                name: user.displayName,
                householdId: newId,
                householdIds: ids,
              },
              { merge: true }
            );
          }
        }

        const fetched = await Promise.all(
          ids.map(async (id) => {
            const hSnap = await getDoc(doc(db, "households", id));
            if (!hSnap.exists()) return null;
            const data = hSnap.data();
            return {
              id,
              name: data.name || "Caderno",
              ownerId: data.ownerId,
              members: data.members || [],
              categories: data.categories || DEFAULT_CATEGORIES,
            };
          })
        );
        const valid = fetched.filter(Boolean);
        setHouseholds(valid);

        const stored = localStorage.getItem(activeStorageKey(user.uid));
        const initial = valid.find((h) => h.id === stored) ? stored : valid[0]?.id || null;
        setActiveId(initial);
      } catch (err) {
        console.error(err);
        setError("Não foi possível carregar seus cadernos.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const switchHousehold = useCallback(
    (id) => {
      setActiveId(id);
      if (user) localStorage.setItem(activeStorageKey(user.uid), id);
    },
    [user]
  );

  const createHousehold = useCallback(
    async (name) => {
      if (!user) return;
      const clean = (name || "").trim() || "Novo caderno";
      try {
        const ref = doc(collection(db, "households"));
        await setDoc(ref, {
          ownerId: user.uid,
          name: clean,
          members: [user.uid],
          categories: DEFAULT_CATEGORIES,
          createdAt: Date.now(),
        });
        await setDoc(
          doc(db, "users", user.uid),
          { householdIds: arrayUnion(ref.id) },
          { merge: true }
        );
        const newHousehold = { id: ref.id, name: clean, ownerId: user.uid, members: [user.uid], categories: DEFAULT_CATEGORIES };
        setHouseholds((prev) => [...prev, newHousehold]);
        switchHousehold(ref.id);
        return { ok: true, id: ref.id };
      } catch (err) {
        console.error(err);
        return { ok: false, message: "Não foi possível criar o caderno." };
      }
    },
    [user, switchHousehold]
  );

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
        const data = targetSnap.data();
        await updateDoc(targetRef, {
          members: arrayUnion(user.uid),
        });
        await setDoc(
          doc(db, "users", user.uid),
          { householdIds: arrayUnion(targetId) },
          { merge: true }
        );
        setHouseholds((prev) => {
          if (prev.some((h) => h.id === targetId)) return prev;
          return [
            ...prev,
            {
              id: targetId,
              name: data.name || "Caderno",
              ownerId: data.ownerId,
              members: [...(data.members || []), user.uid],
              categories: data.categories || DEFAULT_CATEGORIES,
            },
          ];
        });
        switchHousehold(targetId);
        return { ok: true };
      } catch (err) {
        console.error(err);
        return { ok: false, message: "Não foi possível entrar com esse código." };
      }
    },
    [user, switchHousehold]
  );

  const renameHousehold = useCallback(async (id, name) => {
    const clean = (name || "").trim();
    if (!clean) return;
    try {
      await updateDoc(doc(db, "households", id), { name: clean });
      setHouseholds((prev) => prev.map((h) => (h.id === id ? { ...h, name: clean } : h)));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const addCategory = useCallback(
    async (name) => {
      const clean = name.trim();
      const active = households.find((h) => h.id === activeId);
      if (!clean || !active) return;
      if (active.categories.some((c) => c.toLowerCase() === clean.toLowerCase())) return;
      try {
        await updateDoc(doc(db, "households", activeId), {
          categories: arrayUnion(clean),
        });
        setHouseholds((prev) =>
          prev.map((h) => (h.id === activeId ? { ...h, categories: [...h.categories, clean] } : h))
        );
      } catch (err) {
        console.error(err);
      }
    },
    [households, activeId]
  );

  const active = households.find((h) => h.id === activeId);

  return {
    householdId: activeId,
    households,
    members: active?.members || [],
    categories: active?.categories || DEFAULT_CATEGORIES,
    loading,
    error,
    switchHousehold,
    createHousehold,
    renameHousehold,
    joinHousehold,
    addCategory,
  };
}

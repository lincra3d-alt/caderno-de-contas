import { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export function useMemberProfiles(members) {
  const [profiles, setProfiles] = useState({});

  useEffect(() => {
    if (!members || members.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        members.map(async (uid) => {
          try {
            const snap = await getDoc(doc(db, "users", uid));
            return [uid, snap.exists() ? snap.data() : { name: "Alguém" }];
          } catch {
            return [uid, { name: "Alguém" }];
          }
        })
      );
      if (!cancelled) setProfiles(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [members]);

  return profiles;
}

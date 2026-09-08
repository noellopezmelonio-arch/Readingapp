import { useState, useEffect } from 'react';
import type { User } from '../types';

const STORAGE_KEY = 'reading-tracker-users';
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export function useUsers() {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved) as User[];
      } catch (e) {
        console.error('Failed to parse users from localStorage', e);
      }
    }

    // Seed two users when none exist (local development)
    const seeded: User[] = [
      {
        id: crypto.randomUUID(),
        name: 'Noel',
        email: 'noelviajando@gmail.com',
        password: '0306'
      },
      {
        id: crypto.randomUUID(),
        name: 'Mauricio',
        email: 'mauricioglopez@gmail.com',
        password: '1404'
      }
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  // Try to load users from server when available (non-blocking)
  useEffect(() => {
    (async () => {
      try {
        const ping = await fetch(`${API_BASE}/api/ping`);
        if (!ping.ok) return;
        const res = await fetch(`${API_BASE}/api/users`);
        if (!res.ok) return;
        const serverUsers = await res.json();
        // server returns users without passwords; keep local passwords for dev fallback
        setUsers(prev => {
          // merge by email to preserve password when available locally
          const map = new Map(prev.map(u => [u.email, u]));
          serverUsers.forEach((su: any) => {
            const existing = map.get(su.email);
            map.set(su.email, existing ? { ...existing, id: su.id, name: su.name } : { ...su });
          });
          const merged = Array.from(map.values());
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          return merged as User[];
        });
      } catch (e) {
        /* ignore network errors, keep localStorage */
      }
    })();
  }, []);

  const addUser = (u: Omit<User, 'id'>) => {
    const user: User = { ...u, id: crypto.randomUUID() };
    setUsers(prev => [...prev, user]);
    return user;
  };

  const findByEmail = (email: string) => users.find(u => u.email === email);

  // Authenticate tries server first, then local fallback.
  const authenticate = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const u = await res.json();
        return u as User;
      }
    } catch (e) {
      // network error: fall back to local
    }
    const u = users.find(x => x.email === email && x.password === password);
    return u ?? null;
  };

  const deleteUser = (id: string) => setUsers(prev => prev.filter(u => u.id !== id));

  return { users, addUser, findByEmail, authenticate, deleteUser };
}

export default useUsers;

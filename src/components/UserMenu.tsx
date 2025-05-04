'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  if (status === 'loading') {
    return (
      <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
    );
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn()}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Sign in
      </button>
    );
  }

  return (
    <div className="relative ml-3">
      <div>
        <button
          onClick={toggleMenu}
          className="flex items-center max-w-xs text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          id="user-menu"
          aria-haspopup="true"
        >
          <span className="sr-only">Open user menu</span>
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
            {session.user?.email?.[0]?.toUpperCase() || '?'}
          </div>
        </button>
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={closeMenu}
            aria-hidden="true"
          ></div>

          <div
            className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="user-menu"
          >
            <div className="py-1" role="none">
              <div className="px-4 py-2 text-sm text-gray-700 border-b">
                {session.user?.email}
              </div>
              
              <Link
                href="/preferences"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                role="menuitem"
                onClick={closeMenu}
              >
                Preferences
              </Link>

              <button
                onClick={() => {
                  closeMenu();
                  signOut({ callbackUrl: '/' });
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                role="menuitem"
              >
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
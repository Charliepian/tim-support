"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";

/**
 * Masque le footer pendant les étapes d'un parcours (/parcours/{slug}),
 * pour ne pas distraire l'utilisateur en mode tuto et libérer de l'espace
 * sous le contenu. Le footer reste visible sur /parcours (liste) et partout
 * ailleurs sur le site.
 */
export default function ConditionalFooter() {
  const pathname       = usePathname();
  const isParcoursStep = /^\/parcours\/[^/]+/.test(pathname);
  if (isParcoursStep) return null;
  return <Footer />;
}

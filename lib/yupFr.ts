// lib/yupFr.ts
import * as yup from "yup";
import { fr } from "yup-locales";

// Appliquer la locale AU CHARGEMENT DU MODULE
yup.setLocale(fr);

export default yup;

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ko from "./ko.json";
import vi from "./vi.json";
i18n.use(initReactI18next).init({
  resources: { ko: { translation: ko }, vi: { translation: vi } },
  lng: localStorage.getItem("studylab:language") || "ko",
  fallbackLng: "ko",
  interpolation: { escapeValue: false },
});
i18n.on("languageChanged", (lng) => {
  localStorage.setItem("studylab:language", lng);
  document.documentElement.lang = lng;
});
export default i18n;

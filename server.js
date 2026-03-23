// server.js — Express pour Render.com
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── Client Groq (fetch natif, pas de SDK nécessaire) ──
async function groq(prompt, max_tokens = 3000) {
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || "Groq API error");
  return d?.choices?.[0]?.message?.content;
}

// ── Generate ──
app.post("/api/generate", async (req, res) => {
  const { subject, type, level, length, mode, outLang = "fr" } = req.body;
  if (!subject?.trim()) return res.status(400).json({ error: "Subject required" });

  const typesFr = { philosophique:"Philosophique", litteraire:"Littéraire", economique:"Économique", historique:"Historique", scientifique:"Scientifique" };
  const typesEn = { philosophique:"Philosophy", litteraire:"Literature", economique:"Economics", historique:"History", scientifique:"Science" };
  const levelsFr = { college:"Collège", lycee:"Lycée", bts:"BTS/CPGE", universite:"Université" };
  const levelsEn = { college:"Middle School", lycee:"High School", bts:"BTS/CPGE", universite:"University" };

  const T = outLang === "en" ? (typesEn[type] || type) : (typesFr[type] || type);
  const L = outLang === "en" ? (levelsEn[level] || level) : (levelsFr[level] || level);
  const isEn = outLang === "en";

  const prompts = {
    problematique: isEn
      ? `Expert professor. Propose 3 distinct research questions for this ${T} essay, level ${L}.\nSubject: "${subject}"\nNumber each and explain briefly.`
      : `Professeur expert. Propose 3 problématiques pour cette dissertation ${T}, niveau ${L}.\nSujet : "${subject}"\nNumérote et explique brièvement.`,
    plan: isEn
      ? `Write a detailed plan (thesis/antithesis/synthesis) in English for a ${T} essay, level ${L}.\nSubject: "${subject}"`
      : `Plan détaillé (thèse/antithèse/synthèse) en français, dissertation ${T} niveau ${L}.\nSujet : "${subject}"`,
    guide: isEn
      ? `Tutoring. Help a ${L} student write a ${T} essay on "${subject}". Ask 5 guiding questions.`
      : `Tuteur pédagogique. Aide un élève ${L} à rédiger une dissertation ${T} sur "${subject}". Pose 5 questions guidantes.`,
    introduction: isEn
      ? `Write ONLY a perfect academic introduction in English for a ${T} essay, level ${L}: "${subject}".`
      : `Rédige UNIQUEMENT une introduction parfaite en français pour une dissertation ${T} niveau ${L} : "${subject}".`,
    conclusion: isEn
      ? `Write ONLY a perfect academic conclusion in English for a ${T} essay, level ${L}: "${subject}".`
      : `Rédige UNIQUEMENT une conclusion parfaite en français pour une dissertation ${T} niveau ${L} : "${subject}".`,
    complete: isEn
      ? `Write a complete academic ${T} essay in English.\nLevel: ${L} | ~${length} words.\nSubject: "${subject}"\nStructure: Intro, 2-3 part development, Conclusion. Academic style.`
      : `Dissertation ${T} complète en français.\nNiveau : ${L} | ~${length} mots.\nSujet : "${subject}"\nStructure : Intro, développement, Conclusion. Style académique.`,
  };

  try {
    const text = await groq(prompts[mode] || prompts.complete);
    res.json({ result: text });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Score ──
app.post("/api/score", async (req, res) => {
  const { text, subject, level, lang = "fr" } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "Text required" });
  const levels = { college: lang==="fr"?"Collège":"Middle School", lycee: lang==="fr"?"Lycée":"High School", bts:"BTS/CPGE", universite: lang==="fr"?"Université":"University" };
  const L = levels[level] || level || "Lycée";
  const prompt = lang === "en"
    ? `Expert corrector. Evaluate this essay. Return ONLY valid JSON (no backticks):\n{"note_globale":<0-20>,"mention":"<Excellent|Very Good|Good|Fair|Insufficient>","criteres":{"structure":{"note":<0-20>,"commentaire":"<short>"},"arguments":{"note":<0-20>,"commentaire":"<short>"},"style":{"note":<0-20>,"commentaire":"<short>"},"problematique":{"note":<0-20>,"commentaire":"<short>"},"exemples":{"note":<0-20>,"commentaire":"<short>"}},"points_forts":["<1>","<2>","<3>"],"points_ameliorer":["<1>","<2>","<3>"],"conseil_principal":"<tip>"}\nSubject: "${subject||''}" | Level: ${L}\nEssay:\n${text.substring(0,3000)}`
    : `Correcteur expert. Évalue cette dissertation. JSON valide uniquement (sans backticks) :\n{"note_globale":<0-20>,"mention":"<Très Bien|Bien|Assez Bien|Passable|Insuffisant>","criteres":{"structure":{"note":<0-20>,"commentaire":"<court>"},"arguments":{"note":<0-20>,"commentaire":"<court>"},"style":{"note":<0-20>,"commentaire":"<court>"},"problematique":{"note":<0-20>,"commentaire":"<court>"},"exemples":{"note":<0-20>,"commentaire":"<court>"}},"points_forts":["<1>","<2>","<3>"],"points_ameliorer":["<1>","<2>","<3>"],"conseil_principal":"<conseil>"}\nSujet : "${subject||''}" | Niveau : ${L}\nDissertation :\n${text.substring(0,3000)}`;
  try {
    const raw = await groq(prompt, 1000);
    res.json(JSON.parse(raw.replace(/\`\`\`json|\`\`\`/g, "").trim()));
  } catch (e) { res.status(500).json({ error: "Analysis failed" }); }
});

// ── Subjects ──
app.post("/api/subjects", async (req, res) => {
  const { type, level, theme, lang = "fr" } = req.body;
  const typesFr = { philosophique:"Philosophique", litteraire:"Littéraire", economique:"Économique", historique:"Historique", scientifique:"Scientifique" };
  const typesEn = { philosophique:"Philosophy", litteraire:"Literature", economique:"Economics", historique:"History", scientifique:"Science" };
  const levelsFr = { college:"Collège", lycee:"Lycée", bts:"BTS/CPGE", universite:"Université" };
  const levelsEn = { college:"Middle School", lycee:"High School", bts:"BTS/CPGE", universite:"University" };
  const T = lang === "en" ? (typesEn[type] || type) : (typesFr[type] || type);
  const L = lang === "en" ? (levelsEn[level] || level) : (levelsFr[level] || level);
  const prompt = lang === "en"
    ? `Generate 6 ${T} essay topics for level ${L}${theme ? ` on "${theme}"` : ""}. JSON only: {"subjects":[{"subject":"...","difficulty":"Easy|Medium|Hard","theme":"..."},...]} — in English.`
    : `Génère 6 sujets de dissertation ${T} niveau ${L}${theme ? ` sur "${theme}"` : ""}. JSON uniquement : {"subjects":[{"sujet":"...","difficulte":"Facile|Moyen|Difficile","theme":"..."},...]}.`;
  try {
    const raw = await groq(prompt, 900);
    res.json(JSON.parse(raw.replace(/\`\`\`json|\`\`\`/g, "").trim()));
  } catch (e) { res.status(500).json({ error: "Generation error" }); }
});

// ── Render.com : fallback SPA ──
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => console.log(`✦ CyberFrench → http://0.0.0.0:${PORT}`));

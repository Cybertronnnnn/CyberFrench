// api/generate.js — Vercel serverless (si tu veux garder compat Vercel)
// Sur Render.com, ce fichier n'est PAS utilisé → c'est server.js qui gère tout
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { subject, type, level, length, mode, outLang = "fr" } = req.body;
  if (!subject?.trim()) return res.status(400).json({ error: outLang === "fr" ? "Le sujet est requis." : "Subject is required." });

  const typesFr = { philosophique:"Philosophique", litteraire:"Littéraire", economique:"Économique", historique:"Historique", scientifique:"Scientifique" };
  const typesEn = { philosophique:"Philosophy", litteraire:"Literature", economique:"Economics", historique:"History", scientifique:"Science" };
  const levelsFr = { college:"Collège", lycee:"Lycée", bts:"BTS/CPGE", universite:"Université" };
  const levelsEn = { college:"Middle School", lycee:"High School", bts:"BTS/CPGE", universite:"University" };

  const T = outLang === "en" ? (typesEn[type]||type) : (typesFr[type]||type);
  const L = outLang === "en" ? (levelsEn[level]||level) : (levelsFr[level]||level);
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
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", max_tokens: 3000, messages: [{ role: "user", content: prompts[mode] || prompts.complete }] }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data?.error?.message || "Groq API error" });
    return res.status(200).json({ result: data?.choices?.[0]?.message?.content });
  } catch (e) {
    return res.status(500).json({ error: "Erreur serveur: " + e.message });
  }
};

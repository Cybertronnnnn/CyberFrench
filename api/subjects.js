// api/subjects.js — Vercel serverless (si tu veux garder compat Vercel)
// Sur Render.com, ce fichier n'est PAS utilisé → c'est server.js qui gère tout
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { type, level, theme, lang = "fr" } = req.body;

  const typesFr = { philosophique:"Philosophique", litteraire:"Littéraire", economique:"Économique", historique:"Historique", scientifique:"Scientifique" };
  const typesEn = { philosophique:"Philosophy", litteraire:"Literature", economique:"Economics", historique:"History", scientifique:"Science" };
  const levelsFr = { college:"Collège", lycee:"Lycée", bts:"BTS/CPGE", universite:"Université" };
  const levelsEn = { college:"Middle School", lycee:"High School", bts:"BTS/CPGE", universite:"University" };

  const T = lang==="en" ? (typesEn[type]||type) : (typesFr[type]||type);
  const L = lang==="en" ? (levelsEn[level]||level) : (levelsFr[level]||level);
  const themeStr = theme ? ` on the theme "${theme}"` : "";
  const themeStrFr = theme ? ` sur le thème "${theme}"` : "";

  const prompt = lang === "en"
    ? `Generate 6 ${T} essay topics for level ${L}${themeStr}. Return ONLY valid JSON (no backticks): {"subjects":[{"subject":"...","difficulty":"Easy|Medium|Hard","theme":"..."},...]} in English.`
    : `Génère 6 sujets de dissertation ${T} pour le niveau ${L}${themeStrFr}. Retourne UNIQUEMENT du JSON valide (sans backticks) : {"subjects":[{"sujet":"...","difficulte":"Facile|Moyen|Difficile","theme":"..."},...]}.`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", max_tokens: 900, messages: [{ role: "user", content: prompt }] }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: "Erreur API" });
    const raw = data?.choices?.[0]?.message?.content?.trim().replace(/```json|```/g, "").trim();
    return res.status(200).json(JSON.parse(raw));
  } catch (e) {
    return res.status(500).json({ error: "Erreur génération" });
  }
};

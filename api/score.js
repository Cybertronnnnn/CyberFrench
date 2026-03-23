// api/score.js — Vercel serverless (si tu veux garder compat Vercel)
// Sur Render.com, ce fichier n'est PAS utilisé → c'est server.js qui gère tout
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { text, subject, level, lang = "fr" } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: lang === "fr" ? "Texte requis." : "Text required." });

  const levels = { college: lang==="fr"?"Collège":"Middle School", lycee: lang==="fr"?"Lycée":"High School", bts:"BTS/CPGE", universite: lang==="fr"?"Université":"University" };
  const L = levels[level] || level || (lang==="fr" ? "Lycée" : "High School");

  const jsonSchema = '{"note_globale":<0-20>,"mention":"<mention>","criteres":{"structure":{"note":<0-20>,"commentaire":"<court>"},"arguments":{"note":<0-20>,"commentaire":"<court>"},"style":{"note":<0-20>,"commentaire":"<court>"},"problematique":{"note":<0-20>,"commentaire":"<court>"},"exemples":{"note":<0-20>,"commentaire":"<court>"}},"points_forts":["<1>","<2>","<3>"],"points_ameliorer":["<1>","<2>","<3>"],"conseil_principal":"<conseil>"}';

  const prompt = lang === "en"
    ? `You are an expert essay corrector. Evaluate this essay and return ONLY valid JSON (no markdown, no backticks). Mentions: Excellent|Very Good|Good|Fair|Insufficient.\nSchema: ${jsonSchema}\nSubject: "${subject||"Not specified"}" | Level: ${L}\nEssay:\n${text.substring(0,3000)}`
    : `Tu es un correcteur expert. Evalue cette dissertation. Retourne UNIQUEMENT du JSON valide (sans backticks). Mentions: Tres Bien|Bien|Assez Bien|Passable|Insuffisant.\nSchema: ${jsonSchema}\nSujet: "${subject||"Non précisé"}" | Niveau: ${L}\nDissertation:\n${text.substring(0,3000)}`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: "Erreur API" });
    const raw = data?.choices?.[0]?.message?.content?.trim().replace(/```json|```/g, "").trim();
    return res.status(200).json(JSON.parse(raw));
  } catch (e) {
    return res.status(500).json({ error: lang==="fr" ? "Impossible d'analyser." : "Could not analyse." });
  }
};

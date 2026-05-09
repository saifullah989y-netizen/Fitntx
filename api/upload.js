export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  try {
    // 🔥 request stream ko buffer me convert karo
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    // 🔥 VPS ko forward karo (file + headers same)
    const response = await fetch("http://177.7.54.98:3000/upload", {
      method: "POST",
      headers: {
        "content-type": req.headers["content-type"],
      },
      body: buffer,
    });

    const text = await response.text();

    // 🔥 response frontend ko wapas
    res.status(200).send(text);

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    res.status(500).json({ error: "Upload failed" });
  }
}
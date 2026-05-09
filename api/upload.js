export default async function handler(req, res) {
  try {
    const response = await fetch("http://177.7.54.98:3000/upload", {
      method: "POST",
      headers: {
        "content-type": req.headers["content-type"],
      },
      body: req,
    });

    const text = await response.text();
    res.status(200).send(text);

  } catch (err) {
    res.status(500).json({ error: "Upload failed" });
  }
}
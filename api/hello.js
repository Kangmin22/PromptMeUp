export default function handler(req, res) {
  res.json({ message: "Hello World", env: process.env.NODE_ENV });
}
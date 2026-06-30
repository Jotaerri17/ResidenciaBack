const Groq = require('groq-sdk')

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

async function generateQuestionsWithAI(totalQuestions, categories = []) {
  const cats = categories.length > 0 
    ? categories.join(', ') 
    : 'Perecíveis, Mercearia, Eletro, Hipel, Bebidas, Higiene e Limpeza'

  const prompt = `Gere exatamente ${totalQuestions} perguntas de nível técnico-profissional sobre gestão de varejo e supermercados.
Categorias: ${cats}.

Escreva a resposta EXCLUSIVAMENTE no seguinte formato JSON:
{
  "questions": [
    {
      "text": "Enunciado da pergunta",
      "options": ["Opção 0", "Opção 1", "Opção 2", "Opção 3"],
      "correctAnswer": 0,
      "category": "Categoria correspondente"
    }
  ]
}`

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: 'Você é um assistente de IA focado em responder estritamente no formato JSON solicitado.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    response_format: { type: 'json_object' },
    max_tokens: 2048,
    temperature: 0.2
  })

  const raw = response.choices[0].message.content
  const parsed = JSON.parse(raw)
  const questions = Array.isArray(parsed) ? parsed : parsed.questions

  if (!Array.isArray(questions)) throw new Error('Formato inválido retornado pela IA')
  return questions
}

module.exports = { generateQuestionsWithAI }

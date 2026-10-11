module.exports = (err, req, res, next) => {
    if (res.headersSent) return next(err)
    if (err.name === 'ValidationError') return res.status(400).json({ errors: Object.values(err.errors).map(error => error.message) })
    if (err.name === 'CastError') return res.status(400).json({ errors: ['Identificador inválido.'] })
    if (err.status === 400) return res.status(400).json({ errors: ['Corpo da requisição inválido.'] })
    console.error(err)
    res.status(500).json({ errors: ['Erro interno do servidor.'] })
}
package com.richardducat.syncstep

import java.math.BigInteger

/** Minimal Base58 codec (Bitcoin/Solana alphabet) for public keys and signatures. */
object Base58 {
    private const val ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
    private val INDEXES = IntArray(128) { -1 }.also { arr -> ALPHABET.forEachIndexed { i, c -> arr[c.code] = i } }

    fun encode(input: ByteArray): String {
        if (input.isEmpty()) return ""
        var zeros = 0
        while (zeros < input.size && input[zeros].toInt() == 0) zeros++
        var num = BigInteger(1, input)
        val sb = StringBuilder()
        val base = BigInteger.valueOf(58)
        while (num > BigInteger.ZERO) {
            val divRem = num.divideAndRemainder(base)
            sb.append(ALPHABET[divRem[1].toInt()])
            num = divRem[0]
        }
        repeat(zeros) { sb.append(ALPHABET[0]) }
        return sb.reverse().toString()
    }

    fun decode(input: String): ByteArray {
        if (input.isEmpty()) return ByteArray(0)
        var num = BigInteger.ZERO
        val base = BigInteger.valueOf(58)
        for (c in input) {
            val idx = if (c.code < 128) INDEXES[c.code] else -1
            require(idx >= 0) { "Invalid Base58 character '$c'" }
            num = num.multiply(base).add(BigInteger.valueOf(idx.toLong()))
        }
        var zeros = 0
        while (zeros < input.length && input[zeros] == ALPHABET[0]) zeros++
        val body = num.toByteArray().let { if (it.size > 1 && it[0].toInt() == 0) it.copyOfRange(1, it.size) else if (num == BigInteger.ZERO) ByteArray(0) else it }
        return ByteArray(zeros) + body
    }

    fun looksLikeBase58(s: String): Boolean = s.isNotEmpty() && s.all { it.code < 128 && INDEXES[it.code] >= 0 }
}

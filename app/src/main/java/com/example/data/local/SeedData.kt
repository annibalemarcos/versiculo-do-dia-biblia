package com.example.data.local

import com.example.data.local.db.*
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object SeedData {

    val initialThemes = listOf(
        ThemeEntity("fe", "Fé", "star", "Fortaleça sua confiança nas promessas divinas", 12),
        ThemeEntity("ansiedade", "Ansiedade", "favorite", "Encontre alívio e descanso para a alma", 10),
        ThemeEntity("esperanca", "Esperança", "wb_sunny", "Renove sua expectativa no agir de Deus", 8),
        ThemeEntity("amor", "Amor", "favorite_border", "O amor sacrificial que transforma tudo", 14),
        ThemeEntity("paz", "Paz", "spa", "A paz que excede todo o entendimento", 11),
        ThemeEntity("coragem", "Coragem", "shield", "Seja forte e corajoso diante dos desafios", 9),
        ThemeEntity("gratidao", "Gratidão", "celebration", "Reconheça as bênçãos diárias", 7),
        ThemeEntity("sabedoria", "Sabedoria", "menu_book", "Princípios para decisões sábias", 15),
        ThemeEntity("perdao", "Perdão", "healing", "Liberdade através da misericórdia", 6),
        ThemeEntity("proposito", "Propósito", "explore", "Descubra a vontade soberana de Deus", 8)
    )

    val initialEmotions = listOf(
        EmotionEntity("ansioso", "Ansioso", "🌿", "Coração acelerado e mente inquieta", "Não andeis ansiosos de coisa alguma; lançai sobre Ele toda vossa ansiedade."),
        EmotionEntity("triste", "Triste", "🌧️", "Sentindo dor e abatimento interior", "O Senhor está perto dos que têm o coração quebrantado e salva os de espírito abatido."),
        EmotionEntity("sozinho", "Sozinho", "🕊️", "Sensação de abandono ou isolamento", "Eis que estou convosco todos os dias, até o fim dos tempos."),
        EmotionEntity("feliz", "Feliz", "✨", "Coração alegre e grato", "Alegrai-vos sempre no Senhor; outra vez digo: alegrai-vos!"),
        EmotionEntity("agradecido", "Agradecido", "🙏", "Reconhecendo as dádivas da vida", "Em tudo dai graças, porque esta é a vontade de Deus em Cristo Jesus."),
        EmotionEntity("com_medo", "Com Medo", "🛡️", "Incerteza sobre o futuro ou perigo", "O Senhor é a minha luz e a minha salvação; de quem terei medo?"),
        EmotionEntity("sem_esperanca", "Sem Esperança", "🌅", "Sentindo que não há saída", "Porque sou eu que conheço os planos que tenho para vocês: planos de lhes dar esperança e um futuro."),
        EmotionEntity("precisando_forca", "Precisando de Força", "⚡", "Exaustão física, mental ou espiritual", "Posso todas as coisas naquele que me fortalece.")
    )

    fun getTodayDailyVerse(): DailyVerseEntity {
        val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        return DailyVerseEntity(
            dateStr = todayStr,
            verseId = "fld_001",
            reference = "Filipenses 4:6-7",
            text = "Não andeis ansiosos de coisa alguma; em tudo, porém, sejam conhecidas, diante de Deus, as vossas petições, pela oração e pela súplica, com ações de graças. E a paz de Deus, que excede todo o entendimento, guardará o vosso coração e a vossa mente em Cristo Jesus.",
            translation = "NVI",
            reflection = "Quando o peso das incertezas tentar roubar a sua calma, transforme cada pensamento em oração. Deus não apenas ouve a sua voz, mas derrama uma paz sobrenatural que protege seu coração.",
            theme = "Ansiedade",
            emotion = "ansioso"
        )
    }

    val sampleVerses = listOf(
        VerseEntity(
            id = "fld_001",
            bookName = "Filipenses",
            chapter = 4,
            verseNumber = 6,
            text = "Não andeis ansiosos de coisa alguma; em tudo, porém, sejam conhecidas, diante de Deus, as vossas petições, pela oração e pela súplica, com ações de graças.",
            translation = "NVI",
            theme = "Ansiedade",
            emotion = "ansioso",
            reflection = "Apresente suas preocupações a Deus em oração.",
            isDaily = true
        ),
        VerseEntity(
            id = "sl_023",
            bookName = "Salmos",
            chapter = 23,
            verseNumber = 1,
            text = "O Senhor é o meu pastor; de nada terei falta.",
            translation = "NVI",
            theme = "Paz",
            emotion = "sozinho",
            reflection = "Você nunca está desamparado. O Pastor cuida de cada detalhe da sua jornada."
        ),
        VerseEntity(
            id = "is_041",
            bookName = "Isaías",
            chapter = 41,
            verseNumber = 10,
            text = "Por isso não tema, pois estou com você; não tenha medo, pois sou o seu Deus. Eu o fortalecerei e o ajudarei; eu o segurarei com a minha mão direita vitoriosa.",
            translation = "NVI",
            theme = "Coragem",
            emotion = "com_medo",
            reflection = "A presença de Deus dissipa todo o medo."
        ),
        VerseEntity(
            id = "jr_029",
            bookName = "Jeremias",
            chapter = 29,
            verseNumber = 11,
            text = "Porque sou eu que conheço os planos que tenho para vocês, diz o Senhor, planos de fazê-los prosperar e não de causar dano, planos de dar a vocês esperança e um futuro.",
            translation = "NVI",
            theme = "Esperança",
            emotion = "sem_esperanca",
            reflection = "Deus tem um plano de bênção e paz traçado para o seu amanhã."
        ),
        VerseEntity(
            id = "mt_011",
            bookName = "Mateus",
            chapter = 11,
            verseNumber = 28,
            text = "Venham a mim, todos os que estão cansados e sobrecarregados, e eu lhes darei descanso.",
            translation = "NVI",
            theme = "Paz",
            emotion = "precisando_forca",
            reflection = "Entregue o fardo pesado e receba o refrigério do Senhor."
        ),
        VerseEntity(
            id = "rm_008",
            bookName = "Romanos",
            chapter = 8,
            verseNumber = 28,
            text = "Sabemos que Deus age em todas as coisas para o bem daqueles que o amam, dos que foram chamados de acordo com o seu propósito.",
            translation = "NVI",
            theme = "Propósito",
            emotion = "perdido",
            reflection = "Mesmo em dias difíceis, Deus trabalha nos bastidores para o seu bem."
        ),
        VerseEntity(
            id = "1co_013",
            bookName = "1 Coríntios",
            chapter = 13,
            verseNumber = 4,
            text = "O amor é paciente, o amor é bondoso. Não inveja, não se vangloria, não se orgulha.",
            translation = "NVI",
            theme = "Amor",
            emotion = "feliz",
            reflection = "O amor verdadeiro edifica, cura e perdoa."
        ),
        VerseEntity(
            id = "pv_003",
            bookName = "Provérbios",
            chapter = 3,
            verseNumber = 5,
            text = "Confie no Senhor de todo o seu coração e não se apoie em seu próprio entendimento.",
            translation = "NVI",
            theme = "Sabedoria",
            emotion = "precisando_tomar_uma_decisao",
            reflection = "A verdadeira sabedoria começa na rendição sincera a Deus."
        )
    )

    val sampleDevotionals = listOf(
        DevotionalEntity(
            id = "dev_paz_interior",
            title = "7 Dias de Paz Interior",
            description = "Uma jornada guiada para acalmar a mente, vencer a ansiedade e repousar na graça divina.",
            author = "Pr. Lucas Andrade",
            totalDays = 7,
            currentDay = 1,
            isCompleted = false,
            isPremium = false,
            category = "Paz & Descanso"
        ),
        DevotionalEntity(
            id = "dev_fe_inabalavel",
            title = "Fé em Tempos de Incerteza",
            description = "Como manter a esperança viva quando tudo parece desmoronar ao redor.",
            author = "Ana Clara Silveira",
            totalDays = 5,
            currentDay = 1,
            isCompleted = false,
            isPremium = false,
            category = "Crescimento Espiritual"
        ),
        DevotionalEntity(
            id = "dev_proposito_vida",
            title = "Descobrindo o seu Chamado",
            description = "Princípios bíblicos práticos para discernir a vontade de Deus para seus passos.",
            author = "Equipe Teológica",
            totalDays = 10,
            currentDay = 1,
            isCompleted = false,
            isPremium = true,
            category = "Propósito"
        )
    )

    val sampleDevotionalDays = listOf(
        DevotionalDayEntity(
            id = "dev_paz_d1",
            devotionalId = "dev_paz_interior",
            dayNumber = 1,
            title = "Dia 1: O Silêncio da Presença",
            scriptureRef = "Salmos 46:10",
            scriptureText = "Aquietai-vos e sabei que eu sou Deus; sou exaltado entre as nações, sou exaltado na terra.",
            reflection = "No turbilhão do dia a dia, somos tentados a correr mais rápido para resolver tudo com nossas próprias forças. Mas Deus nos convida a parar. Aquietar-se não é inércia, é um ato supremo de fé. Ao desacelerar o ritmo da mente, abrimos espaço para reconhecer que Ele continua no controle de todas as coisas.",
            prayer = "Senhor Deus, acalma meu coração inquieto neste momento. Ensina-me a descansar na Tua soberania e a confiar que o Teu cuidado é suficiente para a minha vida. Amém.",
            isCompleted = true
        ),
        DevotionalDayEntity(
            id = "dev_paz_d2",
            devotionalId = "dev_paz_interior",
            dayNumber = 2,
            title = "Dia 2: Lançando os Fardos",
            scriptureRef = "1 Pedro 5:7",
            scriptureText = "Lancem sobre ele toda a sua ansiedade, porque ele tem cuidado de vocês.",
            reflection = "Carregar o peso do futuro sozinho é uma carga que nunca fomos feitos para suportar. Quando a ansiedade bater à porta, declare em voz alta que você entrega suas preocupações nas mãos de quem sustenta o universo.",
            prayer = "Pai celestial, entrego a Ti meus medos e incertezas. Livra-me da ilusão do controle e preenche meu ser com a Tua doce paz. Em nome de Jesus, amém.",
            isCompleted = false
        ),
        DevotionalDayEntity(
            id = "dev_paz_d3",
            devotionalId = "dev_paz_interior",
            dayNumber = 3,
            title = "Dia 3: A Paz que Guarda a Mente",
            scriptureRef = "Filipenses 4:7",
            scriptureText = "E a paz de Deus, que excede todo o entendimento, guardará o vosso coração e a vossa mente em Cristo Jesus.",
            reflection = "A paz de Deus não depende da ausência de tempestades, mas da presença do Salvador dentro do barco. É uma paz incompreensível ao mundo, que permanece firme mesmo nas horas mais difíceis.",
            prayer = "Guarda os meus pensamentos, ó Deus. Que a Tua paz seja o sentinela do meu coração durante todas as horas deste dia. Amém.",
            isCompleted = false
        )
    )
}

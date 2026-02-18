/**
 * English stop words list for vocabulary extraction.
 * ~300 common function words that should be excluded from vocabulary analysis.
 */

export const STOP_WORDS = new Set([
  // Articles
  "a", "an", "the",

  // Pronouns
  "i", "me", "my", "myself", "we", "our", "ours", "ourselves",
  "you", "your", "yours", "yourself", "yourselves",
  "he", "him", "his", "himself", "she", "her", "hers", "herself",
  "it", "its", "itself", "they", "them", "their", "theirs", "themselves",
  "what", "which", "who", "whom", "this", "that", "these", "those",

  // Verbs (be/have/do/modal)
  "am", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "having",
  "do", "does", "did", "doing", "done",
  "will", "would", "shall", "should", "may", "might", "must",
  "can", "could", "need", "dare", "ought",

  // Prepositions
  "at", "by", "for", "from", "in", "into", "of", "on", "onto",
  "to", "with", "without", "about", "above", "across", "after",
  "against", "along", "among", "around", "before", "behind", "below",
  "beneath", "beside", "besides", "between", "beyond", "during",
  "except", "inside", "near", "off", "out", "outside", "over",
  "past", "since", "through", "throughout", "toward", "towards",
  "under", "underneath", "until", "upon", "within",

  // Conjunctions
  "and", "but", "or", "nor", "for", "yet", "so",
  "although", "because", "if", "unless", "while", "whereas",
  "whether", "though", "than", "that", "once", "when",

  // Adverbs (common)
  "not", "no", "very", "too", "also", "just", "only", "already",
  "always", "never", "often", "sometimes", "still", "even",
  "here", "there", "where", "how", "why", "when", "then",
  "now", "ago", "again", "further", "once", "soon",
  "well", "almost", "enough", "quite", "rather", "really",
  "ever", "perhaps", "maybe", "please",

  // Determiners / Quantifiers
  "all", "any", "both", "each", "every", "few", "more", "most",
  "much", "many", "no", "some", "such", "several", "own",
  "other", "another", "either", "neither", "less", "least",

  // Common verbs (high-frequency, low information)
  "get", "got", "getting", "gets",
  "go", "going", "gone", "goes", "went",
  "come", "came", "comes", "coming",
  "make", "made", "makes", "making",
  "take", "took", "takes", "taken", "taking",
  "give", "gave", "gives", "given", "giving",
  "say", "said", "says", "saying",
  "see", "saw", "seen", "sees", "seeing",
  "know", "knew", "known", "knows", "knowing",
  "think", "thought", "thinks", "thinking",
  "find", "found", "finds", "finding",
  "put", "puts", "putting",
  "use", "used", "uses", "using",
  "tell", "told", "tells", "telling",
  "ask", "asked", "asks", "asking",
  "seem", "seemed", "seems", "seeming",
  "let", "lets", "letting",
  "keep", "kept", "keeps", "keeping",
  "begin", "began", "begun", "begins", "beginning",
  "show", "showed", "shown", "shows", "showing",
  "try", "tried", "tries", "trying",
  "call", "called", "calls", "calling",
  "set", "sets", "setting",
  "run", "ran", "runs", "running",
  "move", "moved", "moves", "moving",
  "live", "lived", "lives", "living",
  "believe", "believed",
  "bring", "brought",
  "happen", "happened",
  "write", "wrote", "written",
  "provide", "provided",
  "sit", "sat",
  "stand", "stood",
  "lose", "lost",
  "pay", "paid",
  "meet", "met",
  "include", "included", "includes", "including",
  "continue", "continued",
  "learn", "learned",
  "change", "changed",
  "lead", "led",
  "understand", "understood",
  "watch", "watched",
  "follow", "followed",
  "stop", "stopped",
  "create", "created",
  "speak", "spoke", "spoken",
  "read", "allow", "add", "spend", "grow", "open", "walk",
  "win", "offer", "remember", "consider", "appear", "buy",
  "serve", "die", "send", "build", "stay", "fall", "cut",
  "reach", "kill", "remain",

  // Numbers and ordinals
  "one", "two", "three", "four", "five", "six", "seven", "eight",
  "nine", "ten", "first", "second", "third",
  "hundred", "thousand", "million", "billion",

  // Other function words
  "able", "like", "back", "up", "down", "way", "long", "new",
  "old", "high", "low", "big", "small", "large", "great",
  "good", "bad", "right", "left", "last", "next", "early", "late",
  "young", "different", "same", "important", "possible",
  "however", "therefore", "thus", "hence", "moreover",
  "furthermore", "nevertheless", "nonetheless", "meanwhile",
  "instead", "otherwise", "indeed", "certainly", "probably",
  "especially", "particularly", "specifically", "generally",
  "usually", "typically", "approximately", "according",
  "et", "al", "eg", "ie", "vs", "etc",

  // Academic paper common words (low information value)
  "study", "studies", "studied",
  "result", "results", "resulted",
  "data", "table", "figure", "fig",
  "total", "number", "group", "groups",
  "based", "case", "cases",
  "report", "reported", "reports",
  "time", "times", "year", "years", "day", "days",
  "month", "months", "week", "weeks",
  "level", "levels", "rate", "rates",
  "type", "types", "form", "forms",
  "part", "parts", "area", "areas",
  "end", "point", "line", "side",
  "percent", "percentage",
]);

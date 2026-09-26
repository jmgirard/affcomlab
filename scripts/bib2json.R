suppressPackageStartupMessages({ library(RefManageR); library(jsonlite) })
bib <- ReadBib("publications.bib", check = FALSE)
strip <- function(x) if (is.null(x) || !length(x)) "" else gsub("[{}]", "", as.character(x[[1]]))
rows <- lapply(names(bib), function(k) {
  e <- bib[[k]]
  au <- e$author
  fam <- if (is.null(au)) character() else vapply(au, function(a) paste(a$family, collapse = " "), character(1))
  yr <- strip(e$year); if (yr == "") yr <- strip(e$date)
  list(
    key = k,
    type = unclass(e)[[1]]$bibtype %||% attr(e, "bibtype"),
    title = strip(e$title),
    year = yr,
    venue = strip(e$journal %||% e$booktitle %||% e$publisher),
    authors = fam,
    primary = identical(tolower(strip(e$primary)), "true"),
    doi = strip(e$doi),
    abstract = strip(e$abstract),
    keywords = strip(e$keywords),
    preprint = strip(e$preprint),
    url = strip(e$url)
  )
})
`%||%` <- function(a, b) if (is.null(a)) b else a
writeLines(toJSON(rows, auto_unbox = TRUE, pretty = FALSE), "data/pubs.json")
cat(length(rows), "entries written\n")

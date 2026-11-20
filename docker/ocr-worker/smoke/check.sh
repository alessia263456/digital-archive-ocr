#!/bin/sh
set -eu

cd "$(dirname "$0")"
languages=$(tesseract --list-langs)
if ! printf '%s\n' "$languages" | grep -qx 'ron'; then
    printf '%s\n' 'Romanian Tesseract language data (ron) is missing.' >&2
    exit 1
fi

tsv=$(tesseract romanian.png stdout -l ron --psm 7 tsv)
printf '%s\n' "$tsv" | awk -F '\t' '
function fail(message) {
    print message > "/dev/stderr"
    failed = 1
    exit 1
}

NR == 1 {
    if ($0 != "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext")
        fail("Unexpected Tesseract TSV header.")
}

$1 == 5 && $12 != "" {
    for (column = 7; column <= 10; column++)
        if ($column !~ /^[0-9]+$/)
            fail("Invalid word Bounding Box on TSV line " NR ".")
    # Dimensions of the checked-in fixture, in pixels.
    if ($9 == 0 || $10 == 0 || $7 + $9 > 1000 || $8 + $10 > 160)
        fail("Invalid word Bounding Box on TSV line " NR ".")

    words[++count] = $12
}

END {
    if (failed)
        exit 1
    if (count != 5 || words[1] != "Știință" || words[2] != "și" ||
        words[3] != "cultură" || words[4] != "în" || words[5] != "România")
        fail("Expected Romanian OCR text: Știință și cultură în România.")
    print "Romanian OCR passed: Știință și cultură în România (5 valid word Bounding Boxes)."
}
'

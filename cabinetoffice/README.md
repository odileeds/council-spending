# Making summaries by local authority

To create the council summary file

`perl bycouncil.pl > bycouncil.txt`

To order the results

`perl sort.pl -sort 4 -cols 1,2,4 -o reverse bycouncil.csv > bycouncil-ordered.csv`

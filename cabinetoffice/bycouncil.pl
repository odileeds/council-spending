#!/usr/bin/perl

open(FILE,"bycouncil.csv");
@lines = <FILE>;
close(FILE);

$csv = $lines[0];

for($i = 1; $i < @lines; $i++){
	$lines[$i] =~ s/[\r\n]//g;
	(@cols) = split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/,$lines[$i]);
	@names = $cols[1];
	$names[0] =~ s/(^\"|\"$)//g;
	$total = 0;
	push(@names,split(/\|/,$cols[2]));
	
	@grep = getTotal(@names);


	foreach $gline (@grep){
		$gline =~ s/[\n\r]//g;
		(@gcols) = split(/\t/,$gline);
		print "\t$gline\n";
		if($gline =~ /\*\*\*/){
			$total += $gcols[1];
		}
	}
	print "\tTOTAL = $total\n";
	$csv .= "$cols[0],$cols[1],$cols[2],$total\n";
	if($cols[1] =~ /Somerset West/){
	#exit;
	}
}

# Over-write the result
open(FILE,">","bycouncil.csv");
print FILE $csv;
close(FILE);



sub getTotal {
	my (@grep,$name,@names,$total,$g,%altnames);
	@names = @_;
	@grep = ();
	$total = 0;

	foreach $name (@names){
		print "\"$name\"\n";
		
		# Remove apostrophes
		$name =~ s/\'//g;

		# Manual fixes
		if($name =~ /County Durham/i){ $name = "DURHAM COUNTY COUNCIL"; }
		#if($name =~ /Kensington and Chelsea/i){ $name = "ROYAL BOROUGH OF KENSINGTON AND CHELSEA"; }

		push(@grep,`grep -i "$name" orgs/*.tsv`);
		if(@grep == 0){
			if($name =~ / and /){
				# Try with ampersand
				$name =~ s/ and / & /g;
				push(@grep,`grep -i "$name" orgs/*.tsv`);
				if(@grep == 0){
					print "No results for ampersand $name\n";
				}else{
					$altnames{$name} = 1;
				}
			}
			# Try replacing hyphens
			if(@grep == 0 && $name =~ /\-/){
				$name =~ s/\-/ /g;
				push(@grep,`grep -i "$name" orgs/*.tsv`);
				if(@grep == 0){
					print "No results for hyphens $name\n";
				}else{
					$altnames{$name} = 1
				}
			}

			# Try commas
			if(@grep == 0 && $name =~ /\,/){
				$name =~ s/\,.*//g;
				push(@grep,`grep -i "$name" orgs/*.tsv`);
				if(@grep == 0){
					print "No results for comma $name\n";
				}else{
					$altnames{$name} = 1
				}
			}

			# Try full stops
			if(@grep == 0 && $name =~ /\./){
				$name =~ s/\.//g;
				push(@grep,`grep -i "$name" orgs/*.tsv`);
				if(@grep == 0){
					print "No results for full stop $name\n";
				}else{
					$altnames{$name} = 1
				}
			}

			# Try removing brackets
			if(@grep == 0 && $name =~ /\(/){
				$name =~ s/ ?\(.*\)//g;
				push(@grep,`grep -i "$name" orgs/*.tsv`);
				if(@grep == 0){
					print "No results for removed brackets $name\n";
				}else{
					$altnames{$name} = 1
				}
			}
		}
		
		$firstword = $name;
		$firstword =~ s/^([^\s]+) .*$/$1/g;
		for($g = 0; $g < @grep; $g++){
			$match = 0;
			if($grep[$g] =~ /council|CITY COUN|CBC|MBC|CORPORATION/i && $grep[$g] =~ /(^|\W)$name( |\t|$)/i){
				$match++;
			}
			foreach $alt (keys(%altnames)){
				if($grep[$g] =~ /council|CITY COUN|CBC|MBC|CORPORATION/i && $grep[$g] =~ /(^|\W)$alt( |\t|$)/i){
					$match++;
				}
			}
			if($grep[$g] =~ /LONDON BOROUGH OF $firstword/i){
				$match++;
			}
			if($grep[$g] =~ /ROYAL BOROUGH OF $firstword/i){
				$match++;
			}
			if($match > 0){
				$grep[$g] = "***".$grep[$g];
			}
		}
	}


	return @grep;
}
#ONS code,Local Authority,Total (April 2010 - June 2019)
#E06000001,Hartlepool,
#E07000215,Tandridge,
#E07000084,Basingstoke and Deane,

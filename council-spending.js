S(document).ready(function(){
	var db = [];
	var beneficiary = {};
	var loaded = new Array();
	var cols = new Array();
	var totals = new Array();
	var urls = {};
	var activeseries = {};
	var chart;
	var barselect = -1;


	S().ajax('summary.csv',{
		'dataType': 'csv',
		'cache':false,
		'complete': function(data,attr){
			if(typeof data==="string") data = data.replace(/\r/,'').split(/[\n]/);
			for(i = 1; i < data.length; i++){
				line = data[i].split("\,");
				totals.push({'month':line[0],'total':parseFloat(line[1])});
				urls[line[0]] = line[2];
			}

			var data = [];

			for(var i = 0; i < totals.length; i++){
				data.push([totals[i].month,totals[i].total]);
			}

			var mainchart = new S.barchart('#totals',{
				'formatX': function(key){
					return (key.indexOf('-01') > 0 ? key.substr(0,4):'');
				},
				'formatY': function(v){ return '&pound;'+v.toLocaleString(); },
				'formatBar': function(){ return "seasonally"; }
			});
			if(S('#download').length==0) S('#totals').after('<div id="download"></div>');
			mainchart.on('barover',function(e){
				S('.balloon').remove();
				var key = this.bins[e.bin].key;
				S(e.event.currentTarget).find('.bar').append('<div class="balloon">'+niceMonth(key)+': &pound;'+addCommas(this.bins[e.bin].value.toFixed(2))+'</div>');
			}).on('barclick',function(e){
				//location.href = urls[this.bins[e.bin].key];
				us = urls[this.bins[e.bin].key].split(/ /);
				var o = "";
				for(var i = 0; i < us.length; i++){
					if(i > 0) o += ', ';
					o += '<a href="'+us[i]+'">'+this.bins[e.bin].key+'</a>'
				}
				S('#download').html('Source data for '+niceMonth(this.bins[e.bin].key)+': '+o+'');
			});

			S('#searchresults').html('');
			mainchart.setData(data).setBins().draw();

		},
		'error': function(e){
			S('#totals').html('<div style="display:table;width: 100%;height:300px;"><div style="text-align:center;vertical-align:middle;display:table-cell;"><h2>Oh noes!</h2><p>Summat went wrong while loading the data.</p></div></div>');
			console.log(e);
		}
	});

	S('#q').attr('autocomplete','off');
	S('#q').on('focus',function(e){

		if(S('#searchresults').length <= 0){
			S('#search form').after('<div id="searchresults"></div>');
		}
		// Need to load the data file for the first letter
		var name = this.e[0].value.toLowerCase();
		if(name.length > 0) getName(name);
		S('.balloon').remove();

	}).on('blur',function(e){

		setTimeout(clearResults,500);

	}).on('keyup',function(e){

		e.preventDefault();

		if(e.originalEvent.keyCode==40 || e.originalEvent.keyCode==38){
			// Down=40
			// Up=38
			var li = S('#searchresults li');
			var s = -1;
			for(var i = 0; i < li.e.length; i++){
				if(S(li.e[i]).hasClass('selected')) s = i;
			}
			if(e.originalEvent.keyCode==40) s++;
			else s--;
			if(s < 0) s = li.e.length-1;
			if(s >= li.e.length) s = 0;
			S('#searchresults .selected').removeClass('selected');
			S(li.e[s]).addClass('selected');
		}else if(e.originalEvent.keyCode==13){
			selectName(S('#searchresults .selected'))
		}else{
			// Need to load the data file for the first letter
			var name = this.e[0].value.toLowerCase();
			getName(name);
		}
	})
	function getName(name){
		var fl = name[0];
		
		if(typeof fl==="string"){
			if(!loaded[fl]){
				S().ajax('orgs/'+fl+'.tsv',{
					'cache':false,
					'complete': function(data){
						var line,i;
						if(typeof data==="string") data = data.replace(/\r/,'').split(/[\n]/);
						for(i = 0; i < data.length; i++){
							line = data[i].split("\t");
							if(parseInt(line[1])){
								ok = true;
								for(var j = 0; j < db.length; j++){
									if(db[j].name == line[0]) ok = false;
								}
								if(ok) db.push({'name':line[0],'n':parseFloat(line[1]),'id':parseInt(line[2])});
							}
						}
						loaded[fl] = true;
						processResult(name);
					},
					'error': function(e){ console.log(e); }
				});
			}else processResult(name);				
		}
		if(name == "") clearResults();
	
	}
	S('form').on('submit',function(e){
		e.preventDefault();
		e.stopPropagation();
	});
	
	function clearResults(){
		// Zap search results
		S('#searchresults').html('');
		return this;			
	}


	function processResult(name){
		var html = "";
		var tmp = new Array();
		var li = S('#searchresults li');
		for(var i = 0 ; i < li.e.length ; i++) S(li.e[i]).off('click');
		name = name.toLowerCase();
		if(name.length >= 1){
			var names = name.split(/ /);
			var n = names.length;
			var mx = 0;
			for(var i = 0; i < db.length; i++){
				if(db[i].n > mx) mx = db[i].n;
				db[i].rank = 0;
			}
			for(var i = 0; i < db.length; i++){
				rank = 0;
				if(db[i].name[0].toLowerCase().indexOf(name)==0){
					rank += (mx*0.1)*name.length;
				}
				for(m = 0; m < n ; m++){
					if(db[i].name.toLowerCase().indexOf(names[m]) >= 0) rank++;
					else rank--;
				}
				if(rank > 0){
					datum = db[i];
					datum.rank = rank*db[i].n/mx;
					tmp.push(datum);
				}
			}
			//console.log(tmp)
			tmp = sortBy(tmp,'rank');
			if(tmp.length > 0){
				S('#searchresults li').off('click');
				html = "<ol>";
				var n = Math.min(tmp.length,15);
				for(var i = 0; i < n; i++){
					html += '<li'+(i==0 ? ' class="selected"':'')+'><a href="#" class="name" data-id="'+tmp[i].id+'">'+tmp[i].name+" &pound;"+addCommas(tmp[i].n.toFixed(2))+"</a></li>";
				}
				html += "</ol>";
			}
		}
		S('#searchresults').html(html);
		var li = S('#searchresults li');
		for(var i = 0 ; i < li.e.length ; i++){
			S(li.e[i]).on('click',function(e){
				e.preventDefault();
				selectName(this);
				return false;
			});
		}
	}

	// Sort the data
	function sortBy(arr,i){
		yaxis = i;
		return arr.sort(function (a, b) {
			return a[i] < b[i] ? 1 : -1;
		});
	}
	
	// Select one of the beneficiaries in the drop down list
	function selectName(selected){
		// Get the ID from the DOM element's data-id attribute
		// Use that to find the index that corresponds to in the "db" hash
		var id = selected.find('.name').attr('data-id');
		var dir = Math.floor(id/50);
		if(S('#barchart').length == 0) S('#key').before('<div id="barchart"></div>');
		if(!beneficiary[id]){
			S('#meta').html('');
			S('#barchart').html('<div class="spinner"><div class="rect1 c14-bg"></div><div class="rect2 c14-bg"></div><div class="rect3 c14-bg"></div><div class="rect4 c14-bg"></div><div class="rect5 c14-bg"></div></div>');
			console.log(id,dir,'orgs/json/'+dir+'.json')
			S().ajax('orgs/json/'+dir+'.json',{
				'id':id,
				'cache':false,
				'dataType': 'json',
				'complete': function(data,attr){
					for(var id in data.data) beneficiary[id] = data.data[id];
					range = data.range;
					if(cols.length == 0){
						var sy = parseInt(range[0].substr(0,4));
						var ey = parseInt(range[1].substr(0,4));
						var sm = parseInt(range[0].substr(5));
						var em = parseInt(range[1].substr(5));
						for(var y = sy; y <= ey; y++){
							for(var m = (y==sy ? sm : 1); m <= (y==ey ? em : 12); m++){
								cols.push(y+'-'+(m < 10 ? "0"+m:m));
							}
						}
					}

					displayData(attr.id,"",true);
					location.href = "#q";
					S('#q')[0].focus();

				},
				'error': function(e){ console.log(e); }
			});
		}else displayData(id,"",true);
	}
	
	function displayData(id,series,rebuild){
		
		var data = [];
		var first = "";
		var last = "";
		var keys = new Array();
		var keyadded = {};
		var grandtotal = 0;
		function getColour(d,name){
			if(typeof colours!=="object"){
				colours = {
					'Strategic Landlord':'c1-bg',

					'Chief Executive\'s Office':'c2-bg',
					'Chief Executive\'s':'c2-bg',
					'Chief Executives':'c2-bg',
					'Deputy Chief Executive':'c2-bg',
					'City Solicitor':'c2-bg',
					'City Development':'c2-bg',
					'Central Divisions':'c2-bg',
					'Central & Corporate':'c2-bg',
					'Central & Corporate Functions':'c2-bg',
					'Civic Enterprise Leeds':'c2-bg',
					'Business Services':'c2-bg',
					'Emp Relations & Resourcing':'c2-bg',
					'Human Resources':'c2-bg',
					'H R':'c2-bg',
					'HRA':'c2-bg',
					'Human Res':'c2-bg',
					'Legal':'c2-bg',
					'Legal & Dem':'c2-bg',
					'Legal Services':'c2-bg',
					'Planning':'c2-bg',
					'Plans & Performance':'c2-bg',
					'Finance':'c2-bg',
					'Financial Services':'c2-bg',
					'Finance Controls':'c2-bg',
					'Grants Capital Purps':'c2-bg',
					'Strategic Accounts':'c2-bg',
					'Strategy, Partnership & Perfom':'c2-bg',

					'Development Services':'c3-bg',
					'Economic Development Service':'c3-bg',
					'Regeneration':'c3-bg',

					'Education Leeds':'c4-bg',
					'Other Education Services':'c4-bg',
					'Other Education Services Managed By E.L.':'c4-bg',
					'Education Client Team':'c4-bg',
					'Ed Contract Services':'c4-bg',
					'Schools Payment Agency':'c4-bg',
					'Educ Fossway S/Start':'c4-bg',
					'Educ Newbiggin S/Start':'c4-bg',
					'Educ Perf Mon':'c4-bg',
					'Educ School Planning':'c4-bg',
					'Educ Linhope PRU':'c4-bg',
					'Educ North Moor Sure S':'c4-bg',
					'EDUCATION':'c4-bg',
					'E & R School Meals':'c4-bg',

					'Citizens and Communities':'c5-bg',
					'Communities and Environment':'c5-bg',
					'Communities And Environment':'c5-bg',
					'Communities and Intelligence':'c5-bg',

					'Resources and Housing':'c6-bg',
					'Resources':'c6-bg',
					'RESOURCES':'c6-bg',
					'Housing':'c6-bg',
					'HOUSING':'c6-bg',
					'Development & Environment':'c6-bg',
					'Development, Enterprise & Environment':'c6-bg',
					'Environment & Housing':'c6-bg',
					'Environment & Neighbourhoods':'c6-bg',
					'Environments and Housing':'c6-bg',
					'Economy and Environment':'c6-bg',
					'Environment & Regeneration':'c6-bg',
					'Neighbourhood Service':'c6-bg',
					'Neigh & St S':'c6-bg',
					'St Scene & Waste Man':'c6-bg',
					'Environment & Sport':'c6-bg',
					'Sport & Leis':'c6-bg',
					'Sport & Leisure':'c6-bg',
					'Sport and Leisure':'c6-bg',
					'Sports and Leisure':'c6-bg',

					'Public Health':'c7-bg',
					'Health & Wellbeing':'c7-bg',

					'Museums, Galleries & Heritage':'c8-bg',
					'Theatres, Arts & Festivals':'c8-bg',
					'Safer and Stronger':'c8-bg',

					'Highways & Transport':'c9-bg',
					'Highways Asset Management':'c9-bg',
					'Traffic & Highways Management':'c9-bg',
					'Transportation Development':'c9-bg',
					'Cityworks Highways':'c9-bg',
					'Highways':'c9-bg',

					'Democratic':'c10-bg',
					'Democratic Services':'c10-bg',

					'Adults and Health':'c11-bg',
					'Adult Social Care':'c11-bg',
					'Soc Serv Adults':'c11-bg',
					'Adult & Comm':'c11-bg',
					'Adult & Community Services':'c11-bg',
					'Adult and Community Services':'c11-bg',
					'Social Services':'c11-bg',
					'Social Services Pooled Budgets':'c11-bg',
					'Social Services-Care Support':'c11-bg',
					'Social Services - Social Care Payments':'c11-bg',
					'SS Adults':'c11-bg',
					'Adults, Health and Social Care':'c11-bg',
					'Communities & Service Support':'c11-bg',
					'Communities':'c11-bg',
					'Communities & Business Change':'c11-bg',
					'Adult Serv Admin Support':'c11-bg',
					'Adult Serv Finance':'c11-bg',
					'Adult - Learning & Development':'c11-bg',
					'Adult Serv Occ Therapy':'c11-bg',
					'Adult and Culture':'c11-bg',
					'Adult & Culture':'c11-bg',

					'Children and Families':'c12-bg',
					'Childrens Services':'c12-bg',
					'Children\'s services':'c12-bg',
					'Soc Serv Children & Young Peop':'c12-bg',
					'Children and Young People':'c12-bg',
					'Childrens Services Support':'c12-bg',
					'Int Childhood Services':'c12-bg',
					'Youth Offending Team':'c12-bg'
				};
			}
			if(colours[name]) return "series-"+d+" "+colours[name];
			else return 'c13-bg'
		}

		for(var i = 0; i < cols.length; i++){
			m = cols[i];
			if(!beneficiary[id]['monthly'][m]) beneficiary[id]['monthly'][m] = {'total':0};
			if(!first && beneficiary[id]['monthly'][m].total > 0) first = m;
			if(beneficiary[id]['monthly'][m].total > 0) last = m;
			if(m){
				// First work out which departments have been involved
				for(d in beneficiary[id]['monthly'][m]){
					if(d != "total" && !keyadded[d]){
						keys.push(d);
						keyadded[d] = 1;
					}
					if(typeof activeseries[d]!=="boolean") activeseries[d] = true;
				}
			}
		}
		// Sort the departments by name
		keys.sort();
		for(var d = 0; d < keys.length; d++) keyadded[keys[d]] = d;

		var keyhtml = '<ul class="key"><li class="b1-bg" data-series="all">All</li><li class="b1-bg" data-series="none">None</li>';
		var table = '<div class="tableholder"><table class="odi"><tr><th>Month</th><th>Total (&pound;)</th>';
		for(var d = 0; d < keys.length; d++){
			if(activeseries[keys[d]]) table += '<th class="'+getColour(d,keys[d])+'"><span>'+keys[d]+'</span></th>';
			keyhtml += '<li class="'+getColour(d,keys[d])+(!activeseries[keys[d]] ? ' deactivate':'')+'" data-series="'+keys[d]+'">'+keys[d]+'</li>';
		}
		table += '<th>Source files</th></tr>';
		keyhtml += '</ul>';

		for(var i = 0 ; i < cols.length; i++){
			m = cols[i];
			if(m){
				stack = new Array(keys.length);
				for(var d = 0; d < stack.length; d++) stack[d] = 0;
				for(var d in beneficiary[id]['monthly'][m]) stack[keyadded[d]] = (activeseries[d]) ? beneficiary[id]['monthly'][m][d] : 0;
				data.push([m,stack]);
			}
		}
		
		for(var i = cols.length-1; i >= 0; i--){
			m = cols[i];
			if(m){
				total = 0;
				for(var d = 0; d < keys.length; d++){
					if(activeseries[keys[d]]) total += (beneficiary[id]['monthly'][m][keys[d]] || 0);
				}
				table += '<tr id="'+m+'"><td>'+m+'</td><td>'+total.toFixed(2)+'</td>';
				for(var d = 0; d < keys.length; d++){
					if(activeseries[keys[d]]) table += '<td>'+(beneficiary[id]['monthly'][m][keys[d]] || 0)+'</td>';
				}
				table += '<td>';
				if(urls[m]){
					urs = urls[m].split(/ /);
					for(var u = 0; u < urs.length; u++){
						if(u > 0) table += ', ';
						table += '<a href="'+urs[u]+'">['+(u+1)+']</a>'
					}
				}
				table += '</td></tr>';
				grandtotal += total;
			}
		}
		table += '</table></div>';

		S('#key').html(keyhtml);

		if(!chart || rebuild){
			S('#barchart').html('');
			chart = new S.barchart('#barchart',{
				'formatX': function(key){ return (key.indexOf('-01') > 0 ? key.substr(0,4):''); },
				'formatY': function(v){ return '&pound;'+v.toLocaleString(); },
				'formatBar': function(key,val,series){
					return (typeof series==="number" ? getColour(series,keys[series]) : "");
				},
				'units': '&pound;'
			});
			chart.on('barover',function(e){
				S('.balloon').remove();
				barselect = e.bin;
				var key = this.bins[barselect].key;
				S(S(e.event.currentTarget).find('.bar')[0]).append('<div class="balloon">'+niceMonth(key)+': &pound;'+addCommas(this.bins[barselect].value.toFixed(2))+'</div>');
				S('.highlightrow').removeClass('highlightrow');
				var rows = S('.odi tr');
				S(rows[rows.length-(parseInt(e.bin)+1)]).addClass('highlightrow');
			}).on('barclick',function(e){
				location.href = "#"+this.bins[e.bin].key;
				
			});
		}

		
		S('#searchresults').html('');

		// Update barchart
		chart.setData(data).setBins().draw();

		// Update balloon
		if(S('.balloon').length == 1) S('.balloon').html(niceMonth(chart.bins[barselect].key)+': &pound;'+addCommas(chart.bins[barselect].value.toFixed(2)));
		
		// Update the table
		S('#table').html(table);

		// Update the key click events
		S('.key li').on('click',function(e){
			var d = (S(e.currentTarget).attr('data-series') || "");
			if(d == "all"){
				for(var s in activeseries) activeseries[s] = true;
			}else if(d == "none"){
				for(var s in activeseries) activeseries[s] = false;
			}else{
				activeseries[d] = !activeseries[d];
			}
			displayData(id,"");
		})

		var sections = "";
		var all = true;
		for(var d = 0; d < keys.length; d++){
			s = keys[d];
			if(s != "total"){
				if(activeseries[s]) sections += (sections ? ', ':'')+s;
				else all = false;
			}
		}
		if(S('#meta').length==0) S('#barchart').before('<div id="meta"></div>');
		var altnames = '';
		if(beneficiary[id]['alternate-names']){

			for(var i = 0; i < beneficiary[id]['alternate-names'].length; i++){
				if(altnames) altnames += (i == beneficiary[id]['alternate-names'].length-1 ? ' and ':', ');
				altnames += '<em>'+beneficiary[id]['alternate-names'][i]+'</em>';
			}
			if(altnames){
				var idx = beneficiary[id]['name'].indexOf(' [GROUPED]');
				if(idx > 0) beneficiary[id]['name'] = beneficiary[id]['name'].substr(0,idx);
			}
		}
		var council = S('#council').html();
		S('#meta').html('<h2>'+beneficiary[id]['name']+'</h2><p>'+beneficiary[id]['name']+(altnames ? '<a href="#othernames">*</a>':'')+' received <strong title="&pound;'+grandtotal.toFixed(2)+'">&pound;'+addCommas(Math.round(grandtotal))+'</strong> from '+council+(!all && sections ? ' (selected categories)':'')+' between '+niceMonth(first)+' and '+niceMonth(last)+'.</p>');
		S('#othernames').html(altnames ? '* We\'ve included '+altnames+'':'');
	}
	
	function niceMonth(m){
		months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
		return months[parseInt(m.substr(5))-1]+' '+m.substr(0,4);
	}
	function addCommas(nStr) {
		nStr += '';
		var x = nStr.split('.');
		var x1 = x[0];
		var x2 = x.length > 1 ? '.' + x[1] : '';
		var rgx = /(\d+)(\d{3})/;
		while (rgx.test(x1)) {
			x1 = x1.replace(rgx, '$1' + ',' + '$2');
		}
		return x1 + x2;
	}

});

/* Global Life Expectancy Explorer — DSC 209R Project 3 */
'use strict';
const YEARS = d3.range(1952, 2008, 5);
const COLOR = d3.scaleSequential().domain([30,85]).interpolator(d3.interpolateRgbBasis(['#faf6bd','#a7dcb9','#35a2b7','#2359a3','#122960'])).clamp(true);
const SERIES = ['#136a75','#d27e42','#754fb2'];
const state = {year:2007, continent:'All', selected:['Japan','United States','India'], selectionMode:'default', playing:false, timer:null};
let observations=[], world, byYear, byCountry, countryByIso, mapSvg, geoPath, mapProjection, lineSvg;
const $ = s => document.querySelector(s);
const fmt = d3.format('.1f');
const countryAliases = {'United States of America':'United States','Dem. Rep. Congo':'Congo, Dem. Rep.','Congo':'Congo, Rep.','Central African Rep.':'Central African Republic','Dominican Rep.':'Dominican Republic','Czechia':'Czech Republic','Bosnia and Herz.':'Bosnia and Herzegovina','S. Sudan':'South Sudan','Eq. Guinea':'Equatorial Guinea','W. Sahara':'Western Sahara','eSwatini':'Swaziland','Somaliland':'Somalia','Myanmar':'Myanmar','North Korea':'Korea, Dem. Rep.','South Korea':'Korea, Rep.','Taiwan':'Taiwan','Macedonia':'Macedonia, FYR','Lao PDR':'Lao PDR','Iran':'Iran','Syria':'Syria','Ivory Coast':"Cote d'Ivoire",'Tanzania':'Tanzania','Vietnam':'Vietnam','Serbia':'Serbia','Palestine':'West Bank and Gaza'};
// Representative examples are fixed using the 2007 ranking, not the currently selected year.
// For an even number of countries, the lower of the two middle ranks is used.
function representativeCountries(continent){
 const ranked=(byYear.get(2007)||[])
   .filter(d=>d.continent===continent)
   .slice().sort((a,b)=>a.life_expectancy-b.life_expectancy || d3.ascending(a.country,b.country));
 if(!ranked.length)return [];
 const picks=[ranked[ranked.length-1],ranked[Math.floor((ranked.length-1)/2)],ranked[0]];
 return [...new Set(picks.map(d=>d.country))];
}
function changeContinent(continent){
 state.continent=continent;
 $('#continent-select').value=continent;
 if(continent==='All'){
   state.selected=['Japan','United States','India'];
   state.selectionMode='default';
 }else{
   state.selected=representativeCountries(continent);
   state.selectionMode='examples';
 }
 render();
}
function updateSelectionExplanation(){
 const el=$('.trend-heading .section-subtitle');
 if(!el)return;
 if(state.continent!=='All' && state.selectionMode==='examples'){
   const names=state.selected;
   el.textContent=names.length===3
     ? `${state.continent} examples based on 2007 life expectancy: highest — ${names[0]}; middle-ranked — ${names[1]}; lowest — ${names[2]}. The ranking stays fixed as you change years. Click a country on the map to customize (up to three).`
     : `Showing ${names.length} examples from ${state.continent}, chosen from the 2007 life expectancy ranking. Change the year to compare their histories.`;
 }else if(state.continent!=='All'){
   el.textContent=`Custom comparison within ${state.continent}. The year marker follows your selected year. Click countries on the map to compare up to three; change continent to load new 2007-ranked examples.`;
 }else{
   el.textContent='Compare up to three countries. Choose a continent to automatically show its highest, middle-ranked, and lowest countries by 2007 life expectancy; or click countries to customize. The year marker follows your selection.';
 }
}
function currentRows(){const rows=byYear.get(state.year)||[];return state.continent==='All'?rows:rows.filter(d=>d.continent===state.continent)}
function showError(err){console.error(err);const banner=$('#error-banner');banner.hidden=false;banner.textContent='Unable to load the visualization: '+err.message+'. Please open this site through GitHub Pages or a local web server (not file://).';}
function setYear(year){state.year=year;$('#year-slider').value=YEARS.indexOf(year);$('#year-output').textContent=year;$('#region-year').textContent=year;render();}
function getRow(feature){const code=feature.properties.iso3; const rows=byYear.get(state.year)||[];return rows.find(d=>d.iso3===code) || rows.find(d=>d.country===countryAliases[feature.properties.name]||d.country===feature.properties.name);}
function countryColor(feature){const d=getRow(feature);if(!d)return '#e5e9e8';return COLOR(d.life_expectancy)}
function updateMap(){
 const rows=currentRows(), vals=rows.map(d=>d.life_expectancy).sort(d3.ascending);
 $('#median-value').textContent=vals.length?fmt(d3.median(vals)):'—';$('#gap-value').textContent=vals.length?fmt(d3.max(vals)-d3.min(vals)):'—';
 $('#map-summary').textContent=`${rows.length} countries · ${state.year}${state.continent==='All'?'':' · '+state.continent}`;
 mapSvg.selectAll('.country').attr('fill',countryColor).classed('dimmed',f=>{const d=getRow(f);return state.continent!=='All'&&(!d||d.continent!==state.continent)}).classed('selected',f=>{const d=getRow(f);return !!d&&state.selected.includes(d.country)}).classed('no-data',f=>!getRow(f));
}
function positionTooltip(node,event,container){const rect=container.getBoundingClientRect(),width=node.offsetWidth,height=node.offsetHeight;let x=event.clientX-rect.left+14,y=event.clientY-rect.top-10;if(x+width>rect.width-8)x=event.clientX-rect.left-width-14;if(y+height>rect.height-8)y=event.clientY-rect.top-height-8;node.style.left=Math.max(5,x)+'px';node.style.top=Math.max(5,y)+'px';}
function initMap(){
 const svg=d3.select('#world-map');mapSvg=svg;const width=1080,height=550;svg.attr('viewBox',`0 0 ${width} ${height}`);
 mapProjection=d3.geoNaturalEarth1().fitExtent([[12,16],[width-12,height-18]],world);
 geoPath=d3.geoPath(mapProjection);
 svg.append('path').datum({type:'Sphere'}).attr('d',geoPath).attr('fill','#f7fbfa');
 const paths=svg.append('g').selectAll('path.country').data(world.features).join('path').attr('class','country').attr('d',geoPath).attr('tabindex',0).attr('role','button').attr('aria-label',f=>`Select ${f.properties.name}`);
 const tip=$('#map-tooltip'),container=$('.map-container');
 paths.on('pointerenter pointermove',function(event,f){const row=getRow(f);tip.hidden=false;tip.innerHTML=`<strong>${row?row.country:f.properties.name}</strong>${row?`<span class="tip-muted">${state.year} · ${row.continent}</span><br>${fmt(row.life_expectancy)} years`:'<span class="tip-muted">No Gapminder observation</span>'}`;positionTooltip(tip,event,container);}).on('pointerleave',()=>tip.hidden=true)
 .on('click',(_event,f)=>{const d=getRow(f);if(d&&(state.continent==='All'||d.continent===state.continent))toggleCountry(d.country);})
 .on('keydown',(event,f)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();const d=getRow(f);if(d&&(state.continent==='All'||d.continent===state.continent))toggleCountry(d.country);}});
}
function toggleCountry(name){state.selectionMode='custom';if(state.selected.includes(name)){state.selected=state.selected.filter(d=>d!==name)}else{if(state.selected.length>=3)state.selected.shift();state.selected.push(name)}render();}
function renderChips(){const chips=d3.select('#selection-chips');chips.selectAll('*').remove();if(!state.selected.length){chips.append('span').attr('class','empty-chips').text('No countries selected — click a country on the map or use the search box.');return;}
 state.selected.forEach((name,i)=>{const c=chips.append('span').attr('class','chip');c.append('span').attr('class','chip-dot').style('background',SERIES[i]);c.append('span').text(name);c.append('button').attr('aria-label',`Remove ${name}`).text('×').on('click',()=>toggleCountry(name));});
}
function drawTrend(){const w=1060,h=375,m={top:24,right:38,bottom:45,left:56};const svg=d3.select('#trend-chart').attr('viewBox',`0 0 ${w} ${h}`);svg.selectAll('*').remove();
 const x=d3.scaleLinear().domain([1952,2007]).range([m.left,w-m.right]);const y=d3.scaleLinear().domain([20,90]).range([h-m.bottom,m.top]);
 svg.append('g').attr('class','grid-lines').selectAll('line').data([30,40,50,60,70,80,90]).join('line').attr('x1',m.left).attr('x2',w-m.right).attr('y1',d=>y(d)).attr('y2',d=>y(d));
 svg.append('g').attr('class','axis').attr('transform',`translate(0,${h-m.bottom})`).call(d3.axisBottom(x).tickValues([1952,1962,1972,1982,1992,2002,2007]).tickFormat(d3.format('d')).tickSizeOuter(0));
 svg.append('g').attr('class','axis').attr('transform',`translate(${m.left},0)`).call(d3.axisLeft(y).tickValues([30,40,50,60,70,80,90]).tickSizeOuter(0));
 svg.append('text').attr('x',m.left).attr('y',14).attr('fill','#78868b').attr('font-size',12).text('Life expectancy (years)');
 svg.append('line').attr('class','year-marker').attr('x1',x(state.year)).attr('x2',x(state.year)).attr('y1',m.top).attr('y2',h-m.bottom);
 svg.append('text').attr('x',Math.min(w-m.right-27,x(state.year)+6)).attr('y',m.top+14).attr('font-size',12).attr('font-weight',700).attr('fill','#718a8e').text(state.year);
 const line=d3.line().x(d=>x(d.year)).y(d=>y(d.life_expectancy));const tip=$('#chart-tooltip'),container=$('#line-chart');
 state.selected.forEach((name,i)=>{const data=byCountry.get(name)||[];if(!data.length)return;
 svg.append('path').datum(data).attr('d',line).attr('fill','none').attr('stroke',SERIES[i]).attr('stroke-width',3.3).attr('stroke-linecap','round').attr('stroke-linejoin','round');
 svg.append('g').selectAll('circle').data(data).join('circle').attr('cx',d=>x(d.year)).attr('cy',d=>y(d.life_expectancy)).attr('r',d=>d.year===state.year?5.7:3.3).attr('fill',SERIES[i]).attr('stroke','white').attr('stroke-width',1.8).style('cursor','crosshair')
 .on('pointerenter pointermove',(event,d)=>{tip.hidden=false;tip.innerHTML=`<strong>${name}</strong><span class="tip-muted">${d.year}</span><br>${fmt(d.life_expectancy)} years`;positionTooltip(tip,event,container);}).on('pointerleave',()=>tip.hidden=true);
 const current=data.find(d=>d.year===state.year);if(current)svg.append('circle').attr('cx',x(current.year)).attr('cy',y(current.life_expectancy)).attr('r',9).attr('stroke',SERIES[i]).attr('stroke-width',1.4).attr('fill','none').attr('pointer-events','none');
 });
 if(!state.selected.length)svg.append('text').attr('x',w/2).attr('y',h/2).attr('text-anchor','middle').attr('fill','#8a999b').attr('font-size',17).text('Choose a country to see its life expectancy trajectory');
}
function drawRegions(){
 const w=1050,h=315,m={top:9,right:65,bottom:37,left:90};
 const svg=d3.select('#region-chart').attr('viewBox',`0 0 ${w} ${h}`);
 svg.selectAll('*').remove();
 const rows=byYear.get(state.year)||[];
 const regions=d3.rollups(rows,v=>d3.mean(v,d=>d.life_expectancy),d=>d.continent)
   .map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
 const x=d3.scaleLinear().domain([0,90]).range([m.left,w-m.right]);
 const y=d3.scaleBand().domain(regions.map(d=>d.name)).range([m.top,h-m.bottom]).padding(.3);
 const filtered=state.continent!=='All';

 // Clicking a bar toggles the continent filter used by BOTH the map and this chart.
 function chooseRegion(name){
   changeContinent(state.continent===name?'All':name);
 }

 svg.append('g').attr('class','grid-lines').selectAll('line')
   .data([0,20,40,60,80]).join('line')
   .attr('x1',d=>x(d)).attr('x2',d=>x(d))
   .attr('y1',m.top).attr('y2',h-m.bottom);
 svg.append('g').attr('class','axis')
   .attr('transform',`translate(0,${h-m.bottom})`)
   .call(d3.axisBottom(x).ticks(5).tickSizeOuter(0));
 svg.append('g').attr('class','axis')
   .attr('transform',`translate(${m.left},0)`)
   .call(d3.axisLeft(y).tickSize(0).tickPadding(12));

 // Full-width transparent targets make both bars and their labels easy to click.
 const groups=svg.selectAll('.region-row').data(regions).join('g')
   .attr('class','region-row')
   .attr('role','button').attr('tabindex',0)
   .attr('aria-label',d=>`${d.name}, ${fmt(d.value)} years. ${state.continent===d.name?'Remove filter':'Filter to this continent'}`)
   .attr('aria-pressed',d=>String(state.continent===d.name))
   .style('cursor','pointer')
   .on('click',(_event,d)=>chooseRegion(d.name))
   .on('keydown',(event,d)=>{
     if(event.key==='Enter'||event.key===' '){event.preventDefault();chooseRegion(d.name)}
   });
 groups.append('rect').attr('class','region-hit-area')
   .attr('x',m.left-88).attr('y',d=>y(d.name)-4)
   .attr('width',w-m.left-4).attr('height',y.bandwidth()+8)
   .attr('fill','transparent');
 groups.append('rect').attr('class','region-bar')
   .attr('x',x(0)).attr('y',d=>y(d.name))
   .attr('height',y.bandwidth()).attr('rx',4)
   .attr('width',d=>x(d.value)-x(0))
   .attr('fill',d=>state.continent===d.name?'#0c5664':'#7eb9b3')
   .attr('opacity',d=>filtered&&d.name!==state.continent?.28:1)
   .attr('stroke',d=>state.continent===d.name?'#073f49':'none')
   .attr('stroke-width',d=>state.continent===d.name?2:0);
 groups.append('text').attr('class','region-label')
   .attr('x',d=>x(d.value)+9)
   .attr('y',d=>y(d.name)+y.bandwidth()/2+5)
   .attr('fill',d=>state.continent===d.name?'#0c5664':'#244854')
   .attr('opacity',d=>filtered&&d.name!==state.continent?.38:1)
   .attr('font-weight',d=>state.continent===d.name?800:700)
   .attr('font-size',14).text(d=>fmt(d.value));

 const summary=`In ${state.year}, the unweighted mean was highest in ${regions[0].name} (${fmt(regions[0].value)} years) and lowest in ${regions[regions.length-1].name} (${fmt(regions[regions.length-1].value)} years).`;
 $('#regional-insight').textContent=filtered
   ? `${state.continent} selected · Map, summary and country journeys show ${state.continent}. Click its bar again to show all continents. ${summary}`
   : `${summary} Click a bar to filter the map; the selected continent will be highlighted here.`;
}

function render(){updateMap();updateSelectionExplanation();renderChips();drawTrend();drawRegions();}
function stopPlaying(){state.playing=false;clearInterval(state.timer);state.timer=null;$('#play-btn').textContent='▶';$('#play-btn').setAttribute('aria-label','Play through years');}
function setupControls(){
 $('#year-slider').addEventListener('input',e=>{stopPlaying();setYear(YEARS[Number(e.target.value)])});
 $('#continent-select').addEventListener('change',e=>changeContinent(e.target.value));
 $('#country-search').addEventListener('change',e=>{const name=e.target.value.trim();if(byCountry.has(name)){const found=byCountry.get(name)[0];if(state.continent!=='All'&&found.continent!==state.continent){e.target.setCustomValidity(`Choose a country in ${state.continent}, or switch to All continents`);e.target.reportValidity();return;}if(!state.selected.includes(name))toggleCountry(name);e.target.value='';}else if(name){e.target.setCustomValidity('Choose a country from the suggestions');e.target.reportValidity();}});
 $('#country-search').addEventListener('input',e=>e.target.setCustomValidity(''));
 $('#clear-btn').addEventListener('click',()=>{state.selected=[];state.selectionMode='custom';render()});
 $('#reset-btn').addEventListener('click',()=>{stopPlaying();changeContinent('All');$('#country-search').value='';setYear(2007)});
 $('#play-btn').addEventListener('click',()=>{if(state.playing){stopPlaying();return}state.playing=true;$('#play-btn').textContent='❚❚';$('#play-btn').setAttribute('aria-label','Pause animation');if(state.year===2007)setYear(1952);state.timer=setInterval(()=>{const idx=YEARS.indexOf(state.year);if(idx===YEARS.length-1){stopPlaying()}else setYear(YEARS[idx+1]);},850)});
}
async function init(){try{
 const [csv,geo]=await Promise.all([d3.csv('data/gapminder.csv',d=>({country:d.country,continent:d.continent,year:+d.year,life_expectancy:+d.life_expectancy,population:+d.population,iso3:d.iso3})),d3.json('data/world.geojson')]);
 if(!csv.length||!geo.features.length)throw new Error('Data files were empty');
 observations=csv;world=geo;byYear=d3.group(observations,d=>d.year);byCountry=d3.group(observations,d=>d.country);countryByIso=d3.group(observations,d=>d.iso3);
 const options=d3.select('#country-options');[...byCountry.keys()].sort().forEach(name=>options.append('option').attr('value',name));
 initMap();setupControls();render();
 }catch(error){showError(error)}}
if(typeof d3==='undefined')showError(new Error('D3.js did not load. Check internet connectivity.'));
else init();

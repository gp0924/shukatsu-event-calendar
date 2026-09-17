const {events,companies,asof}=window.CALENDAR_DATA;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const company=id=>companies.find(c=>c.id===id);
const parse=s=>new Date(s+"T12:00:00+09:00");
const iso=d=>`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;
const shift=(s,n)=>{const d=parse(s);d.setUTCDate(d.getUTCDate()+n);return iso(d)};
const label=s=>{const d=parse(s);return `${d.getUTCMonth()+1}月${d.getUTCDate()}日（${"日月火水木金土"[d.getUTCDay()]}）`};
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
function hasEnded(e,now=new Date()){
 const day=new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
 if(e.date<day)return true;
 if(e.date>day)return false;
 const ranges=[...e.time.matchAll(/(\d{1,2}:\d{2})\s*[～〜~–-]\s*(\d{1,2}:\d{2})/g)];
 if(!ranges.length)return false;
 const end=ranges.map(m=>m[2].padStart(5,"0")).sort().at(-1);
 return now.getTime()>=new Date(`${e.date}T${end}:00+09:00`).getTime();
}
const state={selected:today(),anchor:today(),view:"month",selectedCompanies:new Set(companies.map(c=>c.id)),query:"",area:"",other:true,reference:false,ended:true};
function bounds(){
 const d=parse(state.anchor),y=d.getUTCFullYear(),m=d.getUTCMonth();
 if(state.view==="week"){const start=shift(state.anchor,-d.getUTCDay());return [start,shift(start,6)]}
 return [iso(new Date(Date.UTC(y,m,1,3))),iso(new Date(Date.UTC(y,m+1,0,3)))];
}
function filtered(){
 const q=state.query.trim().toLowerCase();
 return events.filter(e=>state.selectedCompanies.has(e.company)&&(!state.area||state.area===e.area)
 &&(state.other||e.status!=="他社主催")&&(state.reference||!["二次情報","要確認"].includes(e.status))
 &&(state.ended||!hasEnded(e))
 &&(!q||[e.title,e.host,e.venue,e.time,company(e.company).name,company(e.company).label,e.date].join(" ").toLowerCase().includes(q)));
}
function shortTitle(e){
 if(e.company==="jobtv")return e.title.replace("JOBTV ","")+" "+e.area;
 if(e.company==="deiba")return e.title.includes("デアイバ（")?"DEiBA "+e.area:"DEiBA 講座";
 if(e.company==="talent")return "Talent Labo";
 if(e.company==="cheer")return "チアフェス "+e.area;
 if(e.company==="shabell")return (e.title.includes("フェスタ")?"しゃべるFES":"しゃべる")+" "+e.area;
 return e.host==="社長メシ"?"社長メシ":e.host;
}
function card(e){return `<button class="event-card" data-event="${e.id}" style="--company:${company(e.company).color}" aria-label="${esc(e.title)}の詳細"><span class="event-meta"><i class="company-dot"></i>${esc(company(e.company).name)}</span><h3>${esc(e.title)}</h3><div class="time">${esc(e.time==="n.a."?"時間未確認":e.time)}</div><div class="venue">${esc(e.venue)}</div><span class="tag ${e.status==="要確認"?"warn":""}">${esc(e.status)}${hasEnded(e)?" · 終了時刻経過":""}</span></button>`}
function setup(){
 $(".snapshot").textContent=`公開情報 · ${asof.replaceAll("-",".")} 巡回確認`;
 const dates=events.map(e=>e.date).sort();
 $("#range").textContent=dates.length?`${dates[0].slice(0,7).replace("-",".")} ～ ${dates.at(-1).slice(0,7).replace("-",".")}`:"未収録";
 $("#update-note").textContent=`毎日9時（日本時間）に公開情報を確認する設定です。直近の6サイト巡回確認日：${asof}。取得・公開処理が遅延または失敗する場合があります。受付状況は確認元をご覧ください。`;
 $("#source-intro").textContent=`${companies.length}社・サービスの公開イベントを収録しています。収録開始日：${dates[0]||"未収録"}。過去日程は履歴として保持しています。`;
 document.documentElement.dataset.theme=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
 $("#companies").innerHTML=companies.map(c=>`<label class="company-filter" style="--company:${c.color}"><input type="checkbox" value="${c.id}" checked aria-label="${esc(c.name)}を表示"><span class="company-copy"><strong>${esc(c.name)}</strong><small>${esc(c.label)}</small></span><span class="company-count">${events.filter(e=>e.company===c.id&&!["二次情報","要確認"].includes(e.status)).length}</span></label>`).join("");
 [...new Set(events.map(e=>e.area))].sort().forEach(a=>{$("#area").insertAdjacentHTML("beforeend",`<option value="${esc(a)}">${esc(a)}</option>`)});
 $("#source-list").innerHTML=companies.map(c=>`<div class="source-item"><span>${esc(c.name)}<small> · ${events.filter(e=>e.company===c.id).length}日程</small></span><a href="${c.url}" target="_blank" rel="noopener noreferrer">公式ページ ↗</a></div>`).join("")+`<div class="source-item"><span>参考日程：ネオキャリア</span><a href="https://www.neo-career.co.jp/humanresource/deainoba/" target="_blank" rel="noopener noreferrer">確認元 ↗</a></div>`;
 $("#companies").addEventListener("change",e=>{if(e.target.checked)state.selectedCompanies.add(e.target.value);else state.selectedCompanies.delete(e.target.value);render()});
 $("#all").onclick=()=>{const all=state.selectedCompanies.size===companies.length;state.selectedCompanies=new Set(all?[]:companies.map(c=>c.id));$$("#companies input").forEach(i=>i.checked=!all);render()};
 $("#mobile-filter").onclick=()=>{$(".sidebar").classList.toggle("mobile-filters");$("#mobile-filter").setAttribute("aria-expanded",$(".sidebar").classList.contains("mobile-filters"))};
 ["other","reference","ended"].forEach(id=>$("#"+id).onchange=e=>{state[id]=e.target.checked;render()});
 $("#area").onchange=e=>{state.area=e.target.value;render()};
 $("#search").oninput=e=>{state.query=e.target.value;render()};
 $("#reset").onclick=reset;
 $("#prev").onclick=()=>move(-1);$("#next").onclick=()=>move(1);
 $("#today").onclick=()=>{state.anchor=today();state.selected=today();render()};
 $$("[data-view]").forEach(b=>b.onclick=()=>{state.view=b.dataset.view;render()});
 $("#theme").onclick=()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==="dark"?"light":"dark"};
 $("#info").onclick=()=>$("#sources").showModal();
 $("#export").onclick=exportCSV;
 document.addEventListener("click",e=>{
  const event=e.target.closest("[data-event]");if(event){showEvent(events.find(v=>v.id===event.dataset.event));return}
  const day=e.target.closest("[data-date]");if(day){state.selected=day.dataset.date;render();return}
  if(e.target.closest("[data-next-event]")){const next=filtered().find(v=>v.date>state.selected);if(next){state.selected=next.date;state.anchor=next.date;render()}}
 });
 $$("dialog").forEach(d=>d.addEventListener("click",e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}}));
 render();
}
function reset(){state.selectedCompanies=new Set(companies.map(c=>c.id));state.query="";state.area="";state.other=true;state.reference=false;state.ended=true;$("#search").value="";$("#area").value="";["other","reference","ended"].forEach(id=>$("#"+id).checked=state[id]);$$("#companies input").forEach(i=>i.checked=true);render()}
function move(n){if(state.view==="week")state.anchor=shift(state.anchor,n*7);else{const d=parse(state.anchor);state.anchor=iso(new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+n,1,3)))}const [s,t]=bounds();if(state.selected<s||state.selected>t)state.selected=filtered().find(e=>e.date>=s&&e.date<=t)?.date||s;render()}
function render(){
 const all=filtered(),[start,end]=bounds(),periodEvents=all.filter(e=>e.date>=start&&e.date<=end),d=parse(state.anchor);
 $("#period").textContent=state.view==="week"?`${label(start).split("（")[0]} – ${label(end).split("（")[0]}`:`${d.getUTCFullYear()}年 ${d.getUTCMonth()+1}月`;
 $("#all-count").textContent=all.length;$("#month-count").textContent=periodEvents.length;$("#period-label").textContent=state.view==="week"?"この週の日程":"この月の日程";
 $("#result-meta").textContent=`${state.selectedCompanies.size} / 6 サービス · ${periodEvents.length} 日程`;
 $("#all").textContent=state.selectedCompanies.size===companies.length?"全解除":"全選択";
 $$("[data-view]").forEach(b=>{b.classList.toggle("active",b.dataset.view===state.view);b.setAttribute("aria-pressed",b.dataset.view===state.view)});
 $(".calendar-layout").classList.toggle("week-layout",state.view==="week");
 if(state.view==="month")renderMonth(all,start,end);else if(state.view==="week")renderWeek(all,start);else renderList(periodEvents);
 $("#selected-label").textContent=label(state.selected);const dayEvents=all.filter(e=>e.date===state.selected);
 $("#day-count").textContent=`${dayEvents.length}件のイベント`;
 $("#day-events").innerHTML=dayEvents.length?dayEvents.map(card).join(""):`<div class="empty"><strong>この日の予定はありません</strong>日付または絞り込み条件を<br>変更してください。${all.some(e=>e.date>state.selected)?'<button class="outline" data-next-event>次の開催日へ →</button>':""}</div>`;
}
function renderMonth(all,start,end){
 const offset=parse(start).getUTCDay(),first=shift(start,-offset),count=Math.ceil((offset+parse(end).getUTCDate())/7)*7;
 let html='<div class="weekdays">'+[..."日月火水木金土"].map(s=>`<span class="weekday">${s}</span>`).join("")+'</div><div class="month-grid">';
 for(let i=0;i<count;i++){
  const day=shift(first,i),items=all.filter(e=>e.date===day),outside=day<start||day>end;
  html+=`<div class="day-cell ${outside?"outside":""} ${day===state.selected?"selected":""}"><button data-date="${day}" class="day-button ${day===today()?"today":""}" aria-label="${day}、${items.length}件">${parse(day).getUTCDate()}</button>`;
  html+=items.slice(0,3).map(e=>`<button class="event-chip ${["二次情報","要確認"].includes(e.status)?"reference":""}" style="--company:${company(e.company).color}" data-event="${e.id}" title="${esc(e.title+"／"+e.time)}">${e.status==="要確認"?"! ":e.status==="二次情報"?"参考 ":""}${esc(shortTitle(e))}</button>`).join("");
  if(items.length>3)html+=`<button class="more-btn" data-date="${day}">+${items.length-3}件</button>`;
  html+="</div>";
 }
 $("#calendar").innerHTML=html+"</div>";
}
function renderWeek(all,start){
 let html='<div class="week-grid">';
 for(let i=0;i<7;i++){const day=shift(start,i),list=all.filter(e=>e.date===day);html+=`<section class="week-col"><button class="day-button ${day===today()?"today":""}" data-date="${day}">${label(day)}</button>`+list.map(e=>`<button class="week-event" data-event="${e.id}" style="--company:${company(e.company).color}"><b>${esc(company(e.company).name)}</b>${esc(e.title)}<small>${esc(e.time==="n.a."?"時間未確認":e.time)}<br>${esc(e.area)} · ${esc(e.status)}</small></button>`).join("")+(!list.length?'<div class="empty">予定なし</div>':"")+"</section>"}
 $("#calendar").innerHTML=html+"</div>";
}
function renderList(list){
 if(!list.length){$("#calendar").innerHTML='<div class="empty"><strong>条件に一致するイベントがありません</strong>別の月を選ぶか、検索・絞り込み条件を変更してください。</div>';return}
 $("#calendar").innerHTML='<div class="agenda">'+[...new Set(list.map(e=>e.date))].map(d=>`<section class="agenda-day"><div class="agenda-date">${parse(d).getUTCMonth()+1}月<strong>${parse(d).getUTCDate()}</strong>${"日月火水木金土"[parse(d).getUTCDay()]}曜日</div><div>${list.filter(e=>e.date===d).map(card).join("")}</div></section>`).join("")+"</div>";
}
function showEvent(e){
 const c=company(e.company),uncertain=e.status==="要確認";
 $("#detail-content").innerHTML=`<div class="event-meta" style="--company:${c.color}"><i class="company-dot"></i>${esc(c.name)}<span class="tag ${uncertain?"warn":""}">${esc(e.status)}</span></div><h2>${esc(e.title)}</h2><dl class="detail-fields"><dt>開催日</dt><dd>${e.date.slice(0,4)}年 ${label(e.date)}${uncertain?"<br><b>原表に日付・曜日の不整合。確定日ではありません。</b>":""}</dd><dt>時間</dt><dd>${esc(e.time==="n.a."?"未確認（時刻の補完なし）":e.time)}<small>（日本時間）</small></dd><dt>開催地</dt><dd>${esc(e.venue)}</dd><dt>主催・掲載</dt><dd>${esc(e.host)}${e.status==="他社主催"?"<br><small>社長メシの運営会社主催ではありません。</small>":""}</dd><dt>対象</dt><dd>${e.note.includes("全学年")?"全学年":e.note.includes("28卒")||["deiba","cheer","shabell","talent","jobtv"].includes(e.company)?"28卒向け（詳細は確認元を参照）":"確認元の募集条件をご確認ください"}</dd></dl><div class="detail-note">${e.date===asof?"本日分は依頼時点（19:50）で終了時刻を過ぎています。<br>":""}${esc(e.note||"開催内容・会場詳細は確認元で最新情報をご確認ください。")}<br>確認日：2026年9月16日</div><a class="source-cta" href="${esc(e.source)}" target="_blank" rel="noopener noreferrer">確認元のイベントページを開く ↗</a><p class="source-caption">${e.status==="二次情報"||uncertain?"採用支援会社掲載の参考情報です。主催者への再確認が必要です。":"開催・募集状況はリンク先でご確認ください。"}</p>`;
 $("#detail-content .detail-note").textContent=`${hasEnded(e)?"終了時刻を経過しています。\n":""}${e.note||"開催内容・会場詳細は確認元で最新情報をご確認ください。"}\n巡回確認日：${asof}（参考日程は公式未確認のまま保持）`;
 $("#detail").showModal();
}
function exportCSV(){
 const data=[["開催日","サービス","イベント名","エリア","会場","時間（JST）","確認区分","備考","確認URL"],...filtered().map(e=>[e.date,company(e.company).name,e.title,e.area,e.venue,e.time,e.status,e.note,e.source])];
 const csv="\ufeff"+data.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(",")).join("\r\n");
 const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="就活イベントカレンダー_表示対象.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
setup();
setInterval(render,60000);

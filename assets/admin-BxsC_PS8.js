import"./latin-ext-700-D6OXlEvP.js";const M="/api/v1/admin",L=["histoire","geographie","droit_politique","sante_sciences","langue_culture","economie","ia_technologie","societe","raisonnement_culturel","temoin"],O=["easy","medium","hard"],r={token:localStorage.getItem("afribench_admin_token")||"",tab:"questions",questions:[],results:[],models:[]},n=e=>document.querySelector(e),i=e=>String(e??"").replace(/[&<>"']/g,o=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[o]);function d(e,o){const t=n("#toast");t.textContent=e,t.className=`toast${o?" err":""}`,t.style.display="block",clearTimeout(t._t),t._t=setTimeout(()=>{t.style.display="none"},2500)}async function c(e,o={}){const t={"Content-Type":"application/json",...o.headers||{}};r.token&&(t.Authorization=`Bearer ${r.token}`);const a=await fetch(M+e,{...o,headers:t});if(a.status===401)throw _(),new Error("Session expirée");const l=a.status===204?null:await a.json().catch(()=>null);if(!a.ok)throw new Error((l==null?void 0:l.detail)||`HTTP ${a.status}`);return l}async function B(e){const o=await c("/login",{method:"POST",body:JSON.stringify({password:e})});r.token=o.token,localStorage.setItem("afribench_admin_token",r.token),T(),await u()}function _(){r.token="",localStorage.removeItem("afribench_admin_token"),n("#appView").classList.add("hidden"),n("#loginView").classList.remove("hidden"),n("#loginErr").textContent=""}function T(){n("#loginView").classList.add("hidden"),n("#appView").classList.remove("hidden")}async function u(){try{[r.questions,r.results,r.models]=await Promise.all([c("/questions"),c("/results"),c("/models")])}catch(e){d(e.message,!0)}w()}function w(){n("#qCount").textContent=r.questions.length,n("#rCount").textContent=r.results.length;const e=(n("#search").value||"").toLowerCase();r.tab==="questions"?N(e):r.tab==="results"?P(e):r.tab==="models"?z(e):X()}const q=new WeakMap;function F(e){let o=q.get(e);return o===void 0&&(o=JSON.stringify(e).toLowerCase(),q.set(e,o)),o}function C(e,o){return!o||F(e).includes(o)}function N(e){const o=r.questions.filter(t=>C(t,e));n("#dataTable").innerHTML=`<thead><tr><th scope="col">ID</th><th scope="col">Catégorie</th><th scope="col">Question</th><th scope="col">Difficulté</th><th scope="col">Réponse</th><th scope="col"></th></tr></thead><tbody>${o.map(t=>`<tr>
      <td class="mono">${i(t.id)}</td>
      <td><span class="pill">${i(t.category)}</span></td>
      <td>${i(t.question)}</td>
      <td>${i(t.difficulty||"")}</td>
      <td class="mono">${i(t.answer||"")}</td>
      <td><div class="actions">
        <button class="btn ghost sm" data-act="edit-question" data-id="${i(t.id)}">Éditer</button>
        <button class="btn danger sm" data-act="delete-question" data-id="${i(t.id)}">Suppr.</button>
      </div></td>
    </tr>`).join("")}${o.length?"":'<tr><td colspan="6" class="empty">Aucune question</td></tr>'}</tbody>`}function P(e){const o=r.results.filter(t=>C(t,e));n("#dataTable").innerHTML=`<thead><tr><th scope="col">#</th><th scope="col">Modèle</th><th scope="col">Label</th><th scope="col">Score</th><th scope="col">Correct/Total</th><th scope="col">Date</th><th scope="col"></th></tr></thead><tbody>${o.map(t=>`<tr>
      <td class="mono">${i(t.id)}</td>
      <td class="mono">${i(t.model)}</td>
      <td>${i(t.model_label||"")}</td>
      <td class="mono">${t.accuracy??"-"}%</td>
      <td class="mono">${t.correct}/${t.total}</td>
      <td class="mono">${i((t.timestamp||"").slice(0,10))}</td>
      <td><div class="actions">
        <button class="btn ghost sm" data-act="edit-result" data-id="${i(t.id)}">Éditer</button>
        <button class="btn danger sm" data-act="delete-result" data-id="${i(t.id)}">Suppr.</button>
      </div></td>
    </tr>`).join("")}${o.length?"":'<tr><td colspan="7" class="empty">Aucun résultat</td></tr>'}</tbody>`}function v(e,o){n("#modalTitle").textContent=e,n("#modalBody").innerHTML=o,n("#modalBackdrop").classList.add("open")}function p(){n("#modalBackdrop").classList.remove("open")}function s(e,o,t={}){const{type:a="text",value:l="",full:m=!1,required:h=!1,options:S=null}=t,k=i(l),y=`f_${e}`;let b;return S?b=`<select id="${y}" name="${e}">${S.map(g=>`<option value="${g}" ${g===l?"selected":""}>${g}</option>`).join("")}</select>`:a==="textarea"?b=`<textarea id="${y}" name="${e}" ${h?"required":""}>${k}</textarea>`:a==="checkbox"?b=`<input type="checkbox" id="${y}" name="${e}" ${l==="true"||l===!0?"checked":""}>`:b=`<input type="${a}" id="${y}" name="${e}" value="${k}" ${h?"required":""}>`,`<div class="field ${m?"full":""}"><label for="${y}">${o}</label>${b}</div>`}function f(){const e={};return n("#modalBody").querySelectorAll("[name]").forEach(o=>{o.type==="checkbox"?e[o.name]=o.checked:o.type==="number"?e[o.name]=o.value===""?null:Number(o.value):e[o.name]=o.value}),e}function E(e={}){var a,l,m,h;const o={A:((a=e.options)==null?void 0:a.A)||"",B:((l=e.options)==null?void 0:l.B)||"",C:((m=e.options)==null?void 0:m.C)||"",D:((h=e.options)==null?void 0:h.D)||""};return`
    ${e.id?`<input type="hidden" name="id" value="${i(e.id)}"><div class="field"><label>ID</label><input value="${i(e.id)}" disabled></div>`:s("id","ID (ex: HIST-001)",{required:!0})}
    ${s("category","Catégorie",{options:L,value:e.category||"histoire"})}
    ${s("subcategory","Sous-catégorie",{value:e.subcategory||""})}
    ${s("difficulty","Difficulté",{options:O,value:e.difficulty||"medium"})}
    ${s("language","Langue",{value:e.language||"fr"})}
    ${s("question","Question",{type:"textarea",full:!0,required:!0,value:e.question||""})}
    <div class="opts-grid">
      ${s("optA","Option A",{value:o.A,required:!0})}
      ${s("optB","Option B",{value:o.B,required:!0})}
      ${s("optC","Option C",{value:o.C,required:!0})}
      ${s("optD","Option D",{value:o.D,required:!0})}
    </div>
    ${s("answer","Bonne réponse",{options:["A","B","C","D"],value:e.answer||"A"})}
    ${s("source","Source",{value:e.source||""})}
    ${s("explanation","Explication",{type:"textarea",full:!0,value:e.explanation||""})}
    ${s("author","Auteur",{value:e.author||""})}
    ${s("date_created","Date de création",{type:"date",value:e.date_created||""})}
    <div class="field check">${s("is_control","Question témoin (baseline)",{type:"checkbox",value:e.is_control})}</div>
  `}function j(e){const o=r.questions.find(t=>t.id===e);v("Éditer la question",E(o)),n("#modalForm").onsubmit=async t=>{t.preventDefault();const a=f(),l={...a,options:{A:a.optA,B:a.optB,C:a.optC,D:a.optD},is_control:!!a.is_control};delete l.optA,delete l.optB,delete l.optC,delete l.optD;try{await c(`/questions/${encodeURIComponent(e)}`,{method:"PUT",body:JSON.stringify(l)}),d("Question mise à jour"),p(),await u()}catch(m){d(m.message,!0)}}}function R(){v("Nouvelle question",E()),n("#modalForm").onsubmit=async e=>{e.preventDefault();const o=f(),t={...o,options:{A:o.optA,B:o.optB,C:o.optC,D:o.optD},is_control:!!o.is_control};delete t.optA,delete t.optB,delete t.optC,delete t.optD;try{await c("/questions",{method:"POST",body:JSON.stringify(t)}),d("Question créée"),p(),await u()}catch(a){d(a.message,!0)}}}async function J(e){if(confirm(`Supprimer la question ${e} ?`))try{await c(`/questions/${encodeURIComponent(e)}`,{method:"DELETE"}),d("Question supprimée"),await u()}catch(o){d(o.message,!0)}}function D(e={}){return`
    ${s("model","Modèle (id)",{required:!0,value:e.model||""})}
    ${s("model_label","Label",{value:e.model_label||""})}
    ${s("timestamp","Horodatage (ISO)",{value:e.timestamp||new Date().toISOString()})}
    ${s("correct","Correct",{type:"number",value:e.correct??0})}
    ${s("total","Total",{type:"number",value:e.total??0})}
    ${s("incorrect","Incorrect",{type:"number",value:e.incorrect??""})}
    ${s("no_answer","Sans réponse",{type:"number",value:e.no_answer??""})}
    ${s("accuracy","Accuracy (%)",{type:"number",value:e.accuracy??""})}
    <div class="full" style="font-size:12px;color:var(--muted)">
      Les champs by_category / by_difficulty / details sont générés par l'évaluation
      et ne sont pas éditables ici (conservés tels quels à la création).
    </div>
  `}function Q(e){const o=r.results.find(t=>String(t.id)===String(e));v("Éditer le résultat",D(o)),n("#modalForm").onsubmit=async t=>{t.preventDefault();try{await c(`/results/${e}`,{method:"PUT",body:JSON.stringify(f())}),d("Résultat mis à jour"),p(),await u()}catch(a){d(a.message,!0)}}}function H(){v("Nouveau résultat",D()),n("#modalForm").onsubmit=async e=>{e.preventDefault();try{await c("/results",{method:"POST",body:JSON.stringify(f())}),d("Résultat créé"),p(),await u()}catch(o){d(o.message,!0)}}}async function U(e){if(confirm(`Supprimer le résultat #${e} ?`))try{await c(`/results/${e}`,{method:"DELETE"}),d("Résultat supprimé"),await u()}catch(o){d(o.message,!0)}}const V=["openai","anthropic","google"];function z(e){const o=r.models.filter(t=>C(t,e));n("#dataTable").innerHTML=`<thead><tr><th scope="col">Nom</th><th scope="col">Label</th><th scope="col">Provider</th><th scope="col">Model ID</th><th scope="col">Clé</th><th scope="col"></th></tr></thead><tbody>${o.map(t=>`<tr>
      <td class="mono">${i(t.name)}</td>
      <td>${i(t.label||"")}</td>
      <td><span class="pill">${i(t.provider||"")}</span></td>
      <td class="mono">${i(t.model_id||"")}</td>
      <td>${t.api_key_set?'<span class="pill ok">configurée</span>':'<span class="pill">manquante</span>'}</td>
      <td><div class="actions">
        <button class="btn ghost sm" data-act="edit-model" data-id="${i(t.name)}">Éditer</button>
        <button class="btn sm" data-act="eval-model" data-id="${i(t.name)}">Évaluer</button>
        <button class="btn danger sm" data-act="delete-model" data-id="${i(t.name)}">Suppr.</button>
      </div></td>
    </tr>`).join("")}${o.length?"":'<tr><td colspan="6" class="empty">Aucun modèle</td></tr>'}</tbody>`}function A(e={}){return`
    ${s("name","Nom (id)",{required:!0,value:e.name||""})}
    ${s("label","Label",{value:e.label||""})}
    ${s("provider","Provider",{options:V,value:e.provider||"openai"})}
    ${s("model_id","Model ID",{value:e.model_id||""})}
    ${s("api_base","API base (optionnel)",{value:e.api_base||""})}
    ${s("api_key","Clé API",{type:"password",value:e.api_key||"",full:!0})}
    ${s("max_tokens","Max tokens",{type:"number",value:e.max_tokens??256})}
    ${s("temperature","Temperature",{type:"number",value:e.temperature??0})}
  `}function G(e){const o=r.models.find(t=>t.name===e);v("Éditer le modèle",A(o)),n("#modalForm").onsubmit=async t=>{t.preventDefault();try{await c(`/models/${encodeURIComponent(e)}`,{method:"PUT",body:JSON.stringify(f())}),d("Modèle mis à jour"),p(),await u()}catch(a){d(a.message,!0)}}}function W(){v("Nouveau modèle",A()),n("#modalForm").onsubmit=async e=>{e.preventDefault();try{await c("/models",{method:"POST",body:JSON.stringify(f())}),d("Modèle créé"),p(),await u()}catch(o){d(o.message,!0)}}}async function K(e){if(confirm(`Supprimer le modèle ${e} ?`))try{await c(`/models/${encodeURIComponent(e)}`,{method:"DELETE"}),d("Modèle supprimé"),await u()}catch(o){d(o.message,!0)}}function X(){const e=r.models,o=e.map(a=>`<option value="${i(a.name)}">${i(a.label||a.name)}</option>`).join(""),t=['<option value="">Toutes</option>'].concat(L.map(a=>`<option value="${a}">${a}</option>`)).join("");n("#dataTable").innerHTML=`
    <tr><td colspan="2" style="padding:28px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;max-width:560px">
        <div class="field"><label>Modèle</label><select id="evModel">${o}</select></div>
        <div class="field"><label>Catégorie</label><select id="evCategory">${t}</select></div>
        <div class="field"><label>Few-shot</label><input type="number" id="evFewShot" value="0"></div>
        <div class="field"><label>Limite (optionnel)</label><input type="number" id="evLimit" value=""></div>
      </div>
      <div style="margin-top:18px;display:flex;gap:12px;align-items:center">
        <button class="btn" data-act="eval-form">Lancer l'évaluation</button>
        <span id="evalStatus" style="color:var(--muted);font-size:13px"></span>
      </div>
      ${e.length?"":`<p style="color:var(--muted);margin-top:12px">Aucun modèle configuré. Ajoutez-en un dans l'onglet Modèles.</p>`}
    </td></tr>
  `}async function Y(){await I({model:n("#evModel").value,few_shot:Number(n("#evFewShot").value)||0,limit:n("#evLimit").value===""?null:Number(n("#evLimit").value),category:n("#evCategory").value||null})}async function Z(e){await I({model:e,few_shot:0,limit:null,category:null})}async function I(e){const o=n("#evalStatus");o&&(o.textContent="Lancement…");try{const t=await c("/evaluate",{method:"POST",body:JSON.stringify(e)});d(`Évaluation lancée (job ${t.job_id})`),x(t.job_id,o)}catch(t){d(t.message,!0),o&&(o.textContent="")}}let $=null;async function x(e,o){$&&clearInterval($),o&&(o.textContent=`Job ${e} : en cours…`);const t=()=>{clearInterval($),$=null};$=setInterval(async()=>{try{const a=await fetch(`/api/v1/jobs/${encodeURIComponent(e)}`);if(!a.ok)throw new Error(`HTTP ${a.status}`);const l=await a.json();o&&(o.textContent=`Job ${e} : ${l.status}`),l.status==="completed"?(t(),d("Évaluation terminée"),await u()):l.status==="failed"&&(t(),d(`Échec : ${l.error||""}`,!0),o&&(o.textContent=`Échec : ${l.error||""}`))}catch{t()}},3e3)}document.addEventListener("DOMContentLoaded",()=>{r.token&&(T(),u()),n("#loginForm").addEventListener("submit",async t=>{t.preventDefault(),n("#loginErr").textContent="";try{await B(n("#password").value),n("#password").value=""}catch(a){n("#loginErr").textContent=a.message==="Mot de passe incorrect."?"Mot de passe incorrect.":a.message}}),n("#logoutBtn").addEventListener("click",_),document.querySelectorAll(".tab").forEach(t=>t.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(a=>a.classList.remove("active")),t.classList.add("active"),r.tab=t.dataset.tab,w()}));let e=null;n("#search").addEventListener("input",()=>{clearTimeout(e),e=setTimeout(w,180)}),n("#newBtn").addEventListener("click",()=>{r.tab==="questions"?R():r.tab==="results"?H():r.tab==="models"&&W()}),n("#modalClose").addEventListener("click",p),n("#modalCancel").addEventListener("click",p),n("#modalBackdrop").addEventListener("click",t=>{t.target===n("#modalBackdrop")&&p()});const o={"edit-question":j,"delete-question":J,"edit-result":Q,"delete-result":U,"edit-model":G,"delete-model":K,"eval-model":Z,"eval-form":Y};document.addEventListener("click",t=>{const a=t.target.closest("[data-act]");if(!a)return;const l=o[a.dataset.act];l&&l(a.dataset.id)}),document.addEventListener("keydown",t=>{t.key==="Escape"&&n("#modalBackdrop").classList.contains("open")&&p()})});

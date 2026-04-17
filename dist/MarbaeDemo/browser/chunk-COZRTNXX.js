import{a as c}from"./chunk-FFLPZN36.js";import{R as s,a as o,b as i,d as l}from"./chunk-CBTH4GGL.js";var e=l(c());var a=class r{toastConfig={toast:!0,position:"top-end",showConfirmButton:!1,timer:3e3,timerProgressBar:!0,didOpen:t=>{t.addEventListener("mouseenter",e.default.stopTimer),t.addEventListener("mouseleave",e.default.resumeTimer)}};toastSuccess(t){return e.default.fire(i(o({},this.toastConfig),{icon:"success",title:t}))}toastError(t){return e.default.fire(i(o({},this.toastConfig),{icon:"error",title:t}))}toastInfo(t){return e.default.fire(i(o({},this.toastConfig),{icon:"info",title:t}))}toastWarn(t){return e.default.fire(i(o({},this.toastConfig),{icon:"warning",title:t}))}async confirm(t){return(await e.default.fire({title:t.title,text:t.text,icon:t.icon||"question",showCancelButton:!0,confirmButtonText:t.confirmButtonText||"\u062A\u0623\u0643\u064A\u062F",cancelButtonText:t.cancelButtonText||"\u0625\u0644\u063A\u0627\u0621",reverseButtons:!0,confirmButtonColor:"#BC8545",cancelButtonColor:"#6c757d"})).isConfirmed}async showCredentialsModal(t,n){(await e.default.fire({title:"\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062F\u062E\u0648\u0644",html:`
        <div class="credentials-modal text-start" dir="rtl">
          <div class="mb-3">
            <label class="form-label fw-bold">\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:</label>
            <div class="input-group">
              <input type="text" class="form-control" value="${t}" id="swal-username" readonly>
              <button class="btn btn-outline-secondary" type="button" onclick="navigator.clipboard.writeText('${t}').then(() => {
                const btn = this;
                btn.textContent = '\u2713 \u062A\u0645 \u0627\u0644\u0646\u0633\u062E';
                setTimeout(() => btn.textContent = '\u0646\u0633\u062E', 2000);
              })">\u0646\u0633\u062E</button>
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label fw-bold">\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u0645\u0624\u0642\u062A\u0629:</label>
            <div class="input-group">
              <input type="text" class="form-control" value="${n}" id="swal-password" readonly>
              <button class="btn btn-outline-secondary" type="button" onclick="navigator.clipboard.writeText('${n}').then(() => {
                const btn = this;
                btn.textContent = '\u2713 \u062A\u0645 \u0627\u0644\u0646\u0633\u062E';
                setTimeout(() => btn.textContent = '\u0646\u0633\u062E', 2000);
              })">\u0646\u0633\u062E</button>
            </div>
          </div>
          <div class="alert alert-warning" role="alert">
            <small>\u064A\u0631\u062C\u0649 \u062D\u0641\u0638 \u0647\u0630\u0647 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0648\u0625\u0631\u0633\u0627\u0644\u0647\u0627 \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645. \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0645\u0624\u0642\u062A\u0629 \u0648\u064A\u062C\u0628 \u062A\u063A\u064A\u064A\u0631\u0647\u0627 \u0639\u0646\u062F \u0623\u0648\u0644 \u062A\u0633\u062C\u064A\u0644 \u062F\u062E\u0648\u0644.</small>
          </div>
        </div>
      `,confirmButtonText:"\u062D\u0633\u0646\u0627\u064B",confirmButtonColor:"#BC8545",width:"600px"})).isConfirmed&&await this.toastInfo("\u062A\u0645 \u0646\u0633\u062E \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062F\u062E\u0648\u0644")}async alert(t){return e.default.fire(t)}showLoading(t="\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644..."){e.default.fire({title:t,allowOutsideClick:!1,allowEscapeKey:!1,showConfirmButton:!1,didOpen:()=>{e.default.showLoading()}})}close(){e.default.close()}static \u0275fac=function(n){return new(n||r)};static \u0275prov=s({token:r,factory:r.\u0275fac,providedIn:"root"})};export{a};

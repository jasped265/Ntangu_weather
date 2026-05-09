import { Component } from '@angular/core';

@Component({
  selector: 'app-history',
  template: `
    <div class="animate-in">
      <h1 class="text-headline-xl" style="margin-bottom:8px">Dados Históricos</h1>
      <p class="text-body-sm text-muted" style="margin-bottom:24px">Acesse décadas de padrões climáticos para análise.</p>
      <div class="glass-card" style="padding:40px;text-align:center">
        <span class="material-symbols-outlined" style="font-size:56px;color:var(--primary);opacity:0.6">history</span>
        <h3 class="text-headline-md" style="margin-top:16px">Em Desenvolvimento</h3>
        <p class="text-body-sm text-muted" style="margin-top:8px">Visualizações de dados históricos serão exibidas aqui com integração à API meteorológica.</p>
      </div>
    </div>
  `
})
export class HistoryComponent {}

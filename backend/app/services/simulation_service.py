from typing import List, Optional
from app.schemas.monetization import SimulatorInput, SimulatorOutput, MonthProjection

def calculate_monetization_projection(inp: SimulatorInput) -> SimulatorOutput:
    # Daily sessions = DAU * avg_sessions_per_user_day
    daily_sessions = inp.dau * inp.avg_sessions_per_user_day
    daily_ad_impressions = daily_sessions * inp.ad_impressions_per_session
    monthly_ad_impressions = int(daily_ad_impressions * 30)

    # eCPM: (Impressions / 1000) * eCPM
    monthly_ads_revenue = round((monthly_ad_impressions / 1000.0) * inp.ecpm_reais, 2)

    # Paying users from MAU
    paying_users = int(inp.mau * (inp.premium_conversion_rate_pct / 100.0))
    annual_subs = int(paying_users * (inp.annual_subscribers_pct / 100.0))
    monthly_subs = paying_users - annual_subs

    # Monthly Premium revenue:
    # Monthly subs pay monthly_price_reais each month
    # Annual subs pay annual_price_reais / 12 per month (amortized MRR)
    monthly_subs_revenue = monthly_subs * inp.monthly_price_reais
    annual_subs_monthly_share = annual_subs * (inp.annual_price_reais / 12.0)
    
    mrr = round(monthly_subs_revenue + annual_subs_monthly_share, 2)
    arr = round(mrr * 12.0, 2)
    monthly_premium_revenue = mrr

    monthly_total_revenue = round(monthly_ads_revenue + monthly_premium_revenue, 2)

    arpu = round(monthly_total_revenue / inp.mau, 2) if inp.mau > 0 else 0.0
    arppu = round(monthly_premium_revenue / paying_users, 2) if paying_users > 0 else 0.0

    # -------------------------------------------------------------
    # CÁLCULOS AVANÇADOS DE LTV (LIFETIME VALUE)
    # -------------------------------------------------------------
    churn_rate = max(0.005, inp.monthly_churn_pct / 100.0)  # Evita divisão por zero
    subscriber_lifespan_months = round(1.0 / churn_rate, 1)

    # LTV do Assinante = ARPPU * tempo médio de vida (meses)
    estimated_ltv_subscriber = round(arppu * (1.0 / churn_rate), 2)

    # LTV Blended (ARPU geral considerando anúncios e freemium)
    blended_lifespan_months = min(24.0, max(4.0, subscriber_lifespan_months * 0.6))
    estimated_ltv_blended = round(arpu * blended_lifespan_months, 2)

    # Margem líquida após comissão da Google Play Store (geralmente 15% para assinaturas)
    google_fee_multiplier = 1.0 - (inp.google_play_fee_pct / 100.0)
    net_arppu = arppu * google_fee_multiplier

    # Payback do CAC (Quantos meses para recuperar o custo de aquisição do cliente)
    cac = max(0.01, inp.customer_acquisition_cost_reais)
    cac_payback_months = round(cac / max(0.1, net_arppu), 1)

    # Razão LTV / CAC (Golden ratio: > 3.0x é saudável, > 5.0x é excelente)
    ltv_to_cac_ratio = round(estimated_ltv_subscriber / cac, 2)

    # -------------------------------------------------------------
    # CÁLCULOS DE BREAK-EVEN & CUSTOS OPERACIONAIS
    # -------------------------------------------------------------
    # Custos variáveis do mês:
    # 1. Taxa Google Play sobre assinaturas
    monthly_google_fee = monthly_premium_revenue * (inp.google_play_fee_pct / 100.0)
    # 2. Infraestrutura / Servidores proporcionais (estimativa de R$ 0,02 por MAU)
    monthly_infra_cost = inp.mau * 0.02
    # 3. Marketing para reposição de churn + novos usuários
    new_conversions_estimated = max(10, int(paying_users * (inp.monthly_churn_pct / 100.0)))
    monthly_marketing_cac = new_conversions_estimated * cac

    monthly_estimated_costs = round(
        inp.monthly_fixed_costs_reais + monthly_google_fee + monthly_infra_cost + monthly_marketing_cac,
        2
    )

    estimated_monthly_net_profit = round(monthly_total_revenue - monthly_estimated_costs, 2)
    is_currently_profitable = estimated_monthly_net_profit >= 0

    # Ponto de equilíbrio em assinantes necessários para cobrir exclusivamente os custos fixos:
    contribution_margin_per_sub = max(1.0, net_arppu)
    # Se houver receita de anúncios, deduzimos dos custos fixos
    net_fixed_after_ads = max(0.0, inp.monthly_fixed_costs_reais - monthly_ads_revenue)
    break_even_subscribers_needed = int(net_fixed_after_ads / contribution_margin_per_sub)
    break_even_revenue_needed = round(monthly_estimated_costs, 2)

    # -------------------------------------------------------------
    # PROJEÇÃO DE 12 MESES COM CRESCIMENTO, CHURN E BREAK-EVEN
    # -------------------------------------------------------------
    projections: List[MonthProjection] = []
    current_mau = float(inp.mau)
    current_paying = float(paying_users)
    cumulative_profit = 0.0
    detected_breakeven_month: Optional[int] = None

    for m in range(1, 13):
        # Crescimento de usuários ativos
        current_mau = current_mau * (1.0 + (inp.monthly_user_growth_pct / 100.0))
        
        # Churn de assinantes e novas conversões
        churned = current_paying * (inp.monthly_churn_pct / 100.0)
        new_converts = (current_mau * (inp.monthly_user_growth_pct / 100.0)) * (inp.premium_conversion_rate_pct / 100.0)
        current_paying = max(0.0, current_paying - churned + new_converts)

        # Receita de Ads
        proj_ad_impressions = (current_mau * 0.33) * inp.avg_sessions_per_user_day * inp.ad_impressions_per_session * 30
        proj_ads_rev = (proj_ad_impressions / 1000.0) * inp.ecpm_reais
        
        # Receita de Assinaturas
        proj_annual_subs = current_paying * (inp.annual_subscribers_pct / 100.0)
        proj_monthly_subs = current_paying - proj_annual_subs
        proj_mrr = (proj_monthly_subs * inp.monthly_price_reais) + (proj_annual_subs * (inp.annual_price_reais / 12.0))
        
        proj_total_rev = proj_ads_rev + proj_mrr

        # Custos projetados no mês m
        m_google_fee = proj_mrr * (inp.google_play_fee_pct / 100.0)
        m_infra = current_mau * 0.02
        m_marketing = new_converts * cac
        proj_costs = inp.monthly_fixed_costs_reais + m_google_fee + m_infra + m_marketing

        net_profit = proj_total_rev - proj_costs
        cumulative_profit += net_profit
        is_be_reached = proj_total_rev >= proj_costs

        if is_be_reached and detected_breakeven_month is None:
            detected_breakeven_month = m

        projections.append(
            MonthProjection(
                month=m,
                projected_mau=int(current_mau),
                projected_ads_revenue=round(proj_ads_rev, 2),
                projected_premium_revenue=round(proj_mrr, 2),
                projected_total_revenue=round(proj_total_rev, 2),
                projected_mrr=round(proj_mrr, 2),
                projected_costs=round(proj_costs, 2),
                projected_net_profit=round(net_profit, 2),
                projected_cumulative_profit=round(cumulative_profit, 2),
                is_breakeven_reached=is_be_reached
            )
        )

    return SimulatorOutput(
        is_simulation=True,
        label="SIMULAÇÃO / PROJEÇÃO (NÃO SÃO DADOS REAIS)",
        estimated_monthly_ad_impressions=monthly_ad_impressions,
        estimated_monthly_ads_revenue=monthly_ads_revenue,
        estimated_paying_users=paying_users,
        estimated_mrr=mrr,
        estimated_arr=arr,
        estimated_monthly_premium_revenue=monthly_premium_revenue,
        estimated_monthly_total_revenue=monthly_total_revenue,
        estimated_arpu=arpu,
        estimated_arppu=arppu,
        subscriber_lifespan_months=subscriber_lifespan_months,
        estimated_ltv_subscriber=estimated_ltv_subscriber,
        estimated_ltv_blended=estimated_ltv_blended,
        ltv_to_cac_ratio=ltv_to_cac_ratio,
        cac_payback_months=cac_payback_months,
        monthly_fixed_costs=inp.monthly_fixed_costs_reais,
        monthly_estimated_costs=monthly_estimated_costs,
        break_even_subscribers_needed=break_even_subscribers_needed,
        break_even_revenue_needed=break_even_revenue_needed,
        estimated_monthly_net_profit=estimated_monthly_net_profit,
        break_even_month=detected_breakeven_month,
        is_currently_profitable=is_currently_profitable,
        twelve_months_projection=projections
    )

export const CREDIT_GPS_DISCLAIMER =
  'Limitless Credit GPS provides educational estimates based on common credit scoring factors. It does not guarantee score changes, credit approvals, account removals, or financial outcomes. Actual results vary by credit profile, scoring model, lender, bureau data, and reporting timelines.';

export const OFFER_DISCLAIMER =
  'Product recommendations are educational and may include affiliate partnerships. Approval is not guaranteed. Review all terms before applying.';

export const CONSULTATION_DISCLAIMER =
  'Limitless Credit GPS does not provide legal advice through the app. For legal questions or credit reporting disputes, request a professional review.';

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const calculateUtilization = (balance, limit) => {
  const safeLimit = toNumber(limit);
  if (safeLimit <= 0) return 0;
  return Math.max(0, Math.round((toNumber(balance) / safeLimit) * 100));
};

const isMortgageGoalSoon = (profile = {}) => {
  const goal = String(profile.primary_goal || '').toLowerCase();
  const timeline = String(profile.goal_timeline || '').toLowerCase();
  return (
    goal.includes('home') &&
    (timeline.includes('30') || timeline.includes('60') || timeline.includes('90') || timeline.includes('3 months'))
  );
};

export const getProfileUtilization = (profile = {}) =>
  calculateUtilization(profile.total_card_balance, profile.total_card_limit);

export function estimateProfileRisk(profile = {}) {
  const utilization = getProfileUtilization(profile);

  if (
    profile.has_late_payments ||
    profile.has_collections ||
    profile.has_chargeoffs ||
    utilization >= 50
  ) {
    return 'High';
  }

  if (utilization >= 30 || isMortgageGoalSoon(profile) || profile.applying_soon) {
    return 'Medium';
  }

  return 'Low';
}

export function getNextBestAction(profile = {}) {
  const utilization = getProfileUtilization(profile);

  if (isMortgageGoalSoon(profile)) {
    return 'Avoid unnecessary new credit and keep balances low before mortgage review.';
  }

  if (utilization > 30) {
    return 'Lower card utilization before the next statement closes.';
  }

  if (profile.has_late_payments) {
    return 'Protect payment history with automatic minimum payments on every account.';
  }

  if (profile.has_collections || profile.has_chargeoffs) {
    return 'Request a deeper credit review before taking action on negative items.';
  }

  if (String(profile.score_range || '').includes('Not sure')) {
    return 'Check your reports, then run one simulator before applying for new credit.';
  }

  return 'Keep reported balances low and make the next credit move match your goal.';
}

const result = ({
  scenario_type,
  result_direction,
  confidence_level,
  risk_level,
  timeline_estimate,
  explanation,
  recommended_next_action,
  goal_impact,
}) => ({
  scenario_type,
  result_direction,
  confidence_level,
  risk_level,
  timeline_estimate,
  explanation,
  recommended_next_action,
  goal_impact,
  compliance_disclaimer: CREDIT_GPS_DISCLAIMER,
});

export function runSimulation(scenarioType, input = {}, profile = {}) {
  const utilization = getProfileUtilization(profile);

  switch (scenarioType) {
    case 'pay_down_credit_card': {
      const currentBalance = toNumber(input.current_balance, profile.total_card_balance);
      const creditLimit = toNumber(input.credit_limit, profile.total_card_limit);
      const payoffAmount = toNumber(input.payoff_amount);
      const before = calculateUtilization(currentBalance, creditLimit);
      const after = calculateUtilization(Math.max(0, currentBalance - payoffAmount), creditLimit);

      if (before > 90 && after < 50) {
        return result({
          scenario_type: scenarioType,
          result_direction: 'Likely Positive',
          confidence_level: 'High',
          risk_level: 'Low',
          timeline_estimate: '30-45 days after reporting',
          explanation: `This move may help because reported utilization could fall from about ${before}% to about ${after}%. Amounts owed are a major scoring category, and lower card balances often support a healthier profile.`,
          recommended_next_action: 'Keep the balance low before the statement closes so the lower amount is what gets reported.',
          goal_impact: 'Helpful for home, auto, apartment, card, rebuild, and rate goals.',
        });
      }

      if (before > 50 && after < 30) {
        return result({
          scenario_type: scenarioType,
          result_direction: 'Likely Positive',
          confidence_level: 'High',
          risk_level: 'Low',
          timeline_estimate: '30-45 days after reporting',
          explanation: `This may be a strong utilization improvement because the projected reported balance moves from about ${before}% to about ${after}%.`,
          recommended_next_action: 'Pay before the statement date when possible, then avoid new balances until the account reports.',
          goal_impact: 'Strong fit for mortgage readiness, auto approval, apartment approval, and lower-rate goals.',
        });
      }

      if (before > 30 && after < 10) {
        return result({
          scenario_type: scenarioType,
          result_direction: 'Likely Positive',
          confidence_level: 'Medium',
          risk_level: 'Low',
          timeline_estimate: '30-45 days after reporting',
          explanation: `Dropping utilization from about ${before}% to about ${after}% may help, especially if this card has been reporting a high balance.`,
          recommended_next_action: 'Keep at least one small planned charge only if you can pay it off on time.',
          goal_impact: 'Useful for users preparing for an application or rebuilding after high balances.',
        });
      }

      return result({
        scenario_type: scenarioType,
        result_direction: before <= 10 ? 'Neutral / Low Impact' : 'Likely Positive',
        confidence_level: before <= 10 ? 'Medium' : 'Low',
        risk_level: 'Low',
        timeline_estimate: 'Next reporting cycle',
        explanation:
          before <= 10
            ? 'Your utilization already appears low, so paying more may be financially smart but may not create a big credit-score movement.'
            : 'Paying down balances may help, but the estimated impact depends on what balance reports and the rest of your credit profile.',
        recommended_next_action: 'Focus on reporting timing: the statement balance usually matters more than the day you made the payment.',
        goal_impact: 'Mostly helpful when balances are currently high compared with limits.',
      });
    }

    case 'open_new_card': {
      if (isMortgageGoalSoon(profile) || input.applying_soon) {
        return result({
          scenario_type: scenarioType,
          result_direction: 'Temporary Dip Possible',
          confidence_level: 'High',
          risk_level: 'High',
          timeline_estimate: 'Immediate to 90 days',
          explanation:
            'A new card can add a hard inquiry and lower average account age. If a mortgage review is close, lenders may also question recent new credit activity.',
          recommended_next_action: 'Wait until after the mortgage process unless a licensed mortgage professional says the move fits your file.',
          goal_impact: 'High caution for home-buying timelines under 90 days.',
        });
      }

      if (utilization >= 50) {
        return result({
          scenario_type: scenarioType,
          result_direction: 'Mixed',
          confidence_level: 'Medium',
          risk_level: 'Medium',
          timeline_estimate: 'Immediate dip, possible longer-term benefit',
          explanation:
            'A new card may create a short-term inquiry/new-account dip, but the added limit could lower utilization if you do not add new debt.',
          recommended_next_action: 'Compare a credit-limit increase first because it may improve utilization without opening a new account.',
          goal_impact: 'May help rebuild or utilization goals, but can hurt short application timelines.',
        });
      }

      return result({
        scenario_type: scenarioType,
        result_direction: 'Temporary Dip Possible',
        confidence_level: 'Medium',
        risk_level: 'Medium',
        timeline_estimate: 'Immediate to 6 months',
        explanation:
          'Opening credit usually creates a hard inquiry and a younger account age. It can help later if used lightly and paid on time.',
        recommended_next_action: 'Only apply when the card fits your goal and you are not preparing for a major loan soon.',
        goal_impact: 'Potential long-term builder, short-term caution for home, auto, and apartment applications.',
      });
    }

    case 'close_card': {
      const cardLimit = toNumber(input.card_limit);
      const totalLimit = toNumber(input.total_credit_limit, profile.total_card_limit);
      const totalBalance = toNumber(input.total_card_balance, profile.total_card_balance);
      const projectedLimit = Math.max(0, totalLimit - cardLimit);
      const before = calculateUtilization(totalBalance, totalLimit);
      const after = calculateUtilization(totalBalance, projectedLimit);
      const oldCard = String(input.card_age || '').toLowerCase().includes('old');

      if (after >= 30 && after > before) {
        return result({
          scenario_type: scenarioType,
          result_direction: 'Likely Negative',
          confidence_level: 'High',
          risk_level: oldCard ? 'High' : 'Medium',
          timeline_estimate: 'Next reporting cycle',
          explanation: `Closing this card may raise reported utilization from about ${before}% to about ${after}% because available credit decreases while balances stay the same.`,
          recommended_next_action: 'Keep the card open with a small planned charge, or lower balances before closing it.',
          goal_impact: 'Risky before home, auto, apartment, card, and lower-rate applications.',
        });
      }

      return result({
        scenario_type: scenarioType,
        result_direction: oldCard ? 'Mixed' : 'Neutral / Low Impact',
        confidence_level: 'Medium',
        risk_level: oldCard ? 'Medium' : 'Low',
        timeline_estimate: 'Next reporting cycle to long-term',
        explanation:
          oldCard
            ? 'An older card may support credit age and available credit. Closing it is not always harmful, but the risk depends on your remaining limits and account history.'
            : 'If the card is newer, low-limit, and unused, the score impact may be limited as long as utilization stays low.',
        recommended_next_action: 'Check projected utilization before closing. Avoid closing cards right before a major application.',
        goal_impact: 'Most important for mortgage, auto, and rebuild timelines.',
      });
    }

    case 'request_limit_increase': {
      if (input.hard_pull_likely || isMortgageGoalSoon(profile)) {
        return result({
          scenario_type: scenarioType,
          result_direction: 'Mixed',
          confidence_level: 'Medium',
          risk_level: isMortgageGoalSoon(profile) ? 'High' : 'Medium',
          timeline_estimate: 'Immediate to next reporting cycle',
          explanation:
            'A higher limit may lower utilization, but a hard inquiry can create a temporary negative signal. The tradeoff matters more near a mortgage or auto review.',
          recommended_next_action: 'Ask whether the issuer can review with a soft pull before submitting the request.',
          goal_impact: 'Useful for utilization, caution when applying soon.',
        });
      }

      return result({
        scenario_type: scenarioType,
        result_direction: utilization >= 30 ? 'Likely Positive' : 'Neutral / Low Impact',
        confidence_level: 'Medium',
        risk_level: 'Low',
        timeline_estimate: 'Next reporting cycle',
        explanation:
          'A higher limit can lower utilization if balances do not increase. This may help most when your current balances are high compared with limits.',
        recommended_next_action: 'Use the added limit as breathing room, not as permission to carry more debt.',
        goal_impact: 'Good fit for utilization, rebuild, and lower-rate preparation.',
      });
    }

    case 'pay_off_auto_loan':
      return result({
        scenario_type: scenarioType,
        result_direction: profile.has_mortgage || profile.has_student_loans ? 'Neutral / Low Impact' : 'Temporary Dip Possible',
        confidence_level: 'Medium',
        risk_level: isMortgageGoalSoon(profile) ? 'Medium' : 'Low',
        timeline_estimate: '30-90 days after account update',
        explanation:
          'Paying off a car loan is financially responsible. Credit scores may still react if it was your only active installment account or if account mix changes.',
        recommended_next_action: 'Do not keep debt only for a score. If a mortgage is close, ask your loan professional before changing installment balances.',
        goal_impact: 'Usually positive financially, with possible short-term score movement.',
      });

    case 'pay_off_mortgage':
      return result({
        scenario_type: scenarioType,
        result_direction: 'Temporary Dip Possible',
        confidence_level: 'Low',
        risk_level: 'Low',
        timeline_estimate: '60-90 days after reporting',
        explanation:
          'Paying off a mortgage can change active installment history and account mix. That does not mean the payoff is bad; credit scoring is only one part of the decision.',
        recommended_next_action: 'Make the financial decision first, then monitor how the paid account reports.',
        goal_impact: 'Mostly relevant for long-term planning and rate-shopping after payoff.',
      });

    case 'pay_collection': {
      if (input.inaccurate_item) {
        return result({
          scenario_type: scenarioType,
          result_direction: 'Depends on Profile',
          confidence_level: 'Low',
          risk_level: 'Medium',
          timeline_estimate: '30-90 days or longer',
          explanation:
            'If a collection is inaccurate or outdated, the better first move may be reviewing the reporting details instead of rushing to pay.',
          recommended_next_action: 'Request a professional review and learn your dispute options before taking action.',
          goal_impact: 'Important for rebuild, apartment approval, mortgage readiness, and collection repair goals.',
        });
      }

      return result({
        scenario_type: scenarioType,
        result_direction: 'Depends on Profile',
        confidence_level: 'Low',
        risk_level: 'Medium',
        timeline_estimate: '30-90 days or longer',
        explanation:
          'Paying a collection may help some newer scoring models or lender reviews, but it may not immediately raise every score because reporting status and scoring model matter.',
        recommended_next_action: 'Confirm who owns the account, request written terms, and avoid assuming payment guarantees a score increase.',
        goal_impact: 'Often important for mortgage, apartment, rebuild, and collection goals.',
      });
    }

    case 'remove_inaccurate_item':
      return result({
        scenario_type: scenarioType,
        result_direction: 'Likely Positive',
        confidence_level: 'Medium',
        risk_level: 'Low',
        timeline_estimate: '30 days or longer',
        explanation:
          'If an inaccurate negative item is corrected or removed, the profile may improve. The impact depends on the item, age, severity, and remaining credit history.',
        recommended_next_action: 'Document the inaccuracy and request a deeper review. The app cannot provide legal advice or promise removal.',
        goal_impact: 'Strong fit for rebuild, collections, apartment, and mortgage-prep goals.',
      });

    case 'consolidate_debt':
      return result({
        scenario_type: scenarioType,
        result_direction: 'Mixed',
        confidence_level: 'Medium',
        risk_level: 'Medium',
        timeline_estimate: 'Immediate dip possible, then 30-90 days',
        explanation:
          'Consolidation can lower card utilization if revolving balances report lower, but a new loan or hard inquiry can create short-term friction.',
        recommended_next_action: 'Compare the before-and-after utilization and make sure the old cards do not build balances again.',
        goal_impact: 'Can support payoff and lower-rate goals, with caution before mortgage or auto applications.',
      });

    case 'apply_for_mortgage':
      return result({
        scenario_type: scenarioType,
        result_direction: profile.has_late_payments || profile.has_collections || utilization > 30 ? 'Mixed' : 'Depends on Profile',
        confidence_level: 'Medium',
        risk_level: profile.has_late_payments || profile.has_collections || utilization > 30 ? 'High' : 'Medium',
        timeline_estimate: 'Now through closing',
        explanation:
          'Mortgage readiness depends on credit, income, debt, documents, and lender rules. Recent late payments, collections, high utilization, and new credit can create risk.',
        recommended_next_action: 'Avoid new credit, keep balances low, and prepare documentation before lender review.',
        goal_impact: 'Directly tied to home-buying readiness.',
      });

    case 'missed_payment':
      return result({
        scenario_type: scenarioType,
        result_direction: 'Likely Negative',
        confidence_level: 'High',
        risk_level: 'High',
        timeline_estimate: 'Once reported, impact can last long-term',
        explanation:
          'Payment history is one of the largest scoring categories. A reported late payment can be a high-risk negative event, especially if it reaches 30 days or more.',
        recommended_next_action: 'Bring the account current quickly, set autopay for minimums, and contact the creditor about hardship or reporting options.',
        goal_impact: 'High risk for every goal, especially mortgage, auto, apartment, and rebuild.',
      });

    default:
      return result({
        scenario_type: scenarioType,
        result_direction: 'Depends on Profile',
        confidence_level: 'Low',
        risk_level: 'Medium',
        timeline_estimate: 'Varies by reporting timeline',
        explanation:
          'This move can affect people differently because credit scores react to reported data, scoring model, account age, utilization, and payment history.',
        recommended_next_action: 'Compare the move against your goal, timeline, and current risk factors before acting.',
        goal_impact: 'Review your goal and application timeline before making the move.',
      });
  }
}

export const scoreDropCauses = [
  {
    id: 'paid_off_loan',
    label: 'I paid off a loan',
    likely_reason: 'Your active installment mix may have changed.',
    what_it_means:
      'Paying off a loan is responsible, but some scoring models react when an active installment account closes or reports a zero balance.',
    whether_to_worry: 'Usually not a reason to panic unless you are applying for a major loan right now.',
    next_step: 'Keep revolving utilization low and avoid opening new credit just to replace the loan.',
    related_lesson: 'credit-mix',
    risk_level: 'Low',
  },
  {
    id: 'opened_new_card',
    label: 'I opened a new card',
    likely_reason: 'A hard inquiry and new account age may be showing.',
    what_it_means:
      'New accounts can create short-term friction even when the card helps utilization later.',
    whether_to_worry: 'Watch it closely if you are applying for a mortgage, auto loan, or apartment soon.',
    next_step: 'Use the card lightly, pay on time, and avoid stacking multiple applications.',
    related_lesson: 'new-credit-inquiries',
    risk_level: 'Medium',
  },
  {
    id: 'closed_card',
    label: 'I closed a card',
    likely_reason: 'Available credit may have decreased.',
    what_it_means:
      'If your balances stayed the same while total limits dropped, utilization may have increased.',
    whether_to_worry: 'It matters most when the closed card was old or had a high limit.',
    next_step: 'Calculate utilization with the closed limit removed, then lower balances if needed.',
    related_lesson: 'credit-utilization',
    risk_level: 'Medium',
  },
  {
    id: 'balance_up',
    label: 'My balance went up',
    likely_reason: 'Reported utilization may have increased.',
    what_it_means:
      'Scores react to the balance that gets reported, which may not match the balance you see today.',
    whether_to_worry: 'Usually fixable if the balance is paid down before the next reporting cycle.',
    next_step: 'Pay before the statement closes and keep individual cards below high utilization levels.',
    related_lesson: 'credit-utilization',
    risk_level: 'Medium',
  },
  {
    id: 'hard_inquiry',
    label: 'A hard inquiry appeared',
    likely_reason: 'A lender checked your credit for a credit application.',
    what_it_means:
      'Hard inquiries can have a short-term effect, especially when several appear close together.',
    whether_to_worry: 'Be careful if you have a major application coming up.',
    next_step: 'Pause extra applications and confirm the inquiry was authorized.',
    related_lesson: 'new-credit-inquiries',
    risk_level: 'Medium',
  },
  {
    id: 'collection_appeared',
    label: 'A collection appeared',
    likely_reason: 'A negative collection account may now be reporting.',
    what_it_means:
      'Collections can be high-impact negative items, depending on age, amount, status, and scoring model.',
    whether_to_worry: 'Take it seriously, especially before housing or lending applications.',
    next_step: 'Review whether the item is accurate and request a professional review if anything looks questionable.',
    related_lesson: 'collections',
    risk_level: 'High',
  },
  {
    id: 'missed_payment',
    label: 'I missed a payment',
    likely_reason: 'Payment history may now show a late payment.',
    what_it_means:
      'A reported late payment can be a high-risk negative signal because payment history is a major scoring category.',
    whether_to_worry: 'Yes, especially if it is 30 days late or more.',
    next_step: 'Bring the account current, set autopay, and contact the creditor quickly.',
    related_lesson: 'payment-history',
    risk_level: 'High',
  },
  {
    id: 'nothing_changed',
    label: 'Nothing changed',
    likely_reason: 'Something may have reported differently than expected.',
    what_it_means:
      'Scores react to bureau data. A balance, limit, account status, inquiry, or old account update may have changed behind the scenes.',
    whether_to_worry: 'Check reports before assuming the score movement is random.',
    next_step: 'Compare recent report updates, balances, limits, and account statuses.',
    related_lesson: 'credit-score-basics',
    risk_level: 'Low',
  },
  {
    id: 'old_account_closed',
    label: 'My old account closed',
    likely_reason: 'Credit age or available credit may have changed.',
    what_it_means:
      'Old accounts can support age and available credit. The effect depends on the rest of your file.',
    whether_to_worry: 'It matters more if the account was your oldest account or had a high limit.',
    next_step: 'Keep remaining accounts active, paid on time, and low balance.',
    related_lesson: 'credit-age',
    risk_level: 'Medium',
  },
  {
    id: 'limit_decreased',
    label: 'My limit decreased',
    likely_reason: 'Your utilization may have jumped.',
    what_it_means:
      'A lower limit can make the same balance look riskier because the balance is a larger share of available credit.',
    whether_to_worry: 'It can matter quickly if utilization moved above common thresholds.',
    next_step: 'Pay balances down or ask the issuer whether the limit can be reviewed again.',
    related_lesson: 'credit-utilization',
    risk_level: 'Medium',
  },
];

export function explainScoreDrop(causeId) {
  return scoreDropCauses.find((cause) => cause.id === causeId) || scoreDropCauses[0];
}

import React, { useState } from 'react';
import { formatEGP } from '../engine/financeEngine';
import {
  calculateEightDayPayrollCommitmentPiastres,
  calculateEmployeeNetPayablePiastres,
  calculateTotalMonthlyPayrollPiastres,
  HR_JOB_AD_TEMPLATES,
} from '../engine/hrEngine';
import { Employee, EmployeeRole, GameState } from '../types/game';

interface EmployeesHRPanelProps {
  state: GameState;
  onScheduleSalaryRaise: (employeeId: string, raisePiastres: number) => void;
  onGrantBonus: (employeeId: string, bonusPiastres: number, reason: string) => void;
  onStartTraining: (employeeId: string) => void;
  onConductInvestigation: (employeeId: string) => void;
  onApplyPenalty: (employeeId: string, reason: string) => void;
  onReassignTasks: (employeeId: string) => void;
  onPostJobAd?: (role: EmployeeRole, customAdCostEgp: number) => void;
  onHireCandidate?: (jobAdId: string, candidateId: string) => void;
  onReviewEmployee?: (employeeId: string) => void;
  onTerminateEmployee?: (employeeId: string) => void;
}

const STATUS_LABELS_AR: Record<Employee['status'], string> = {
  ACTIVE: 'نشط على رأس العمل',
  BUSY: 'في مهمة تشغيلية',
  DELAYED: 'متأخر في خط السير',
  IN_TRAINING: 'في دورة تدريبية',
  UNDER_INVESTIGATION: 'تحت التحقيق الإداري',
  SUSPENDED: 'موقوف مؤقتاً',
  ON_LEAVE: 'في إجازة',
  TERMINATED: 'منتهية خدمته (أرشيف)',
};

export const EmployeesHRPanel: React.FC<EmployeesHRPanelProps> = ({
  state,
  onScheduleSalaryRaise,
  onGrantBonus,
  onStartTraining,
  onConductInvestigation,
  onApplyPenalty,
  onReassignTasks,
  onPostJobAd,
  onHireCandidate,
  onReviewEmployee,
  onTerminateEmployee,
}) => {
  const [adCostsEgp, setAdCostsEgp] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const tpl of HR_JOB_AD_TEMPLATES) {
      map[tpl.role] = tpl.defaultAdCostEgp;
    }
    return map;
  });

  const totalMonthlyPayroll = calculateTotalMonthlyPayrollPiastres(state);
  const eightDayCommitment = calculateEightDayPayrollCommitmentPiastres(state);
  const payrollCycle = state.payrollCycle || {
    cycleLengthDays: 8,
    lastPayrollPaidDay: 0,
    nextPayrollDueDay: 8,
    processedCycleDays: [],
    unpaidSalariesPiastres: 0,
  };

  const jobAds = state.hrJobAds || [];

  return (
    <div className="space-y-4">
      {/* 8-Day Central Payroll Cycle & HR Summary Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white">
            الموارد البشرية (HR) والتوظيف وتقييم الأداء ودورة الرواتب (كل 8 أيام)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            تُصرف الرواتب مركزياً كل 8 أيام عمل من السيولة المتاحة. رسوم إعلانات التوظيف مستقلة عن الرواتب، ولا يجوز إنهاء خدمة موظف إلا إذا انخفض أداؤه تحت 39% وبعد جلسة مراجعة رسمية.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs bg-slate-950 px-4 py-3 rounded-lg border border-slate-800">
          <div>
            <span className="text-slate-400 block">رواتب دورة الـ 8 أيام</span>
            <strong className="font-mono-num text-sm text-amber-400">
              {formatEGP(eightDayCommitment)} / 8 أيام
            </strong>
          </div>
          <span aria-hidden="true" className="text-slate-700">|</span>
          <div>
            <span className="text-slate-400 block">موعد الصرف القادم</span>
            <strong className="font-mono-num text-sm text-emerald-400">
              نهاية اليوم {payrollCycle.nextPayrollDueDay}
            </strong>
          </div>
          <span aria-hidden="true" className="text-slate-700">|</span>
          <div>
            <span className="text-slate-400 block">المائدة الشهرية المكافئة</span>
            <strong className="font-mono-num text-sm text-white">
              {formatEGP(totalMonthlyPayroll)} / شهر
            </strong>
          </div>
          {payrollCycle.unpaidSalariesPiastres > 0 && (
            <>
              <span aria-hidden="true" className="text-slate-700">|</span>
              <div>
                <span className="text-rose-400 block">رواتب متأخرة لم تُصرف</span>
                <strong className="font-mono-num text-sm text-rose-400">
                  {formatEGP(payrollCycle.unpaidSalariesPiastres)}
                </strong>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Section 3: Job Ads & Candidate Recruitment */}
      {onPostJobAd && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">
                نشر إعلانات التوظيف واستقطاب الكفاءات (مبتدئ / متوسط / خبير)
              </h3>
              <p className="text-xs text-slate-400">
                اختر الوظيفة وحدد ميزانية الإعلان لاستقبال 3 مرشحين ومقارنة مهاراتهم ورواتبهم قبل التعيين.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {HR_JOB_AD_TEMPLATES.map((tpl) => {
              const costEgp = adCostsEgp[tpl.role] ?? tpl.defaultAdCostEgp;
              return (
                <div
                  key={tpl.role}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <strong className="text-sm text-white">{tpl.roleTitleAr}</strong>
                      <span className="font-mono-num text-amber-400 text-[11px]">
                        رسوم الإعلان: {tpl.minAdCostEgp}–{tpl.maxAdCostEgp} ج.م
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px]">{tpl.descriptionAr}</p>
                    <div className="pt-1">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">ميزانية الإعلان:</span>
                        <strong className="font-mono-num text-white">{costEgp} ج.م</strong>
                      </div>
                      <input
                        type="range"
                        min={tpl.minAdCostEgp}
                        max={tpl.maxAdCostEgp}
                        step={5}
                        value={costEgp}
                        onChange={(e) =>
                          setAdCostsEgp((prev) => ({
                            ...prev,
                            [tpl.role]: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onPostJobAd(tpl.role, costEgp)}
                    className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    نشر إعلان توظيف ({costEgp}.00 ج.م)
                  </button>
                </div>
              );
            })}
          </div>

          {/* Open Job Ads & Candidates Comparison */}
          {jobAds.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <h4 className="text-xs font-bold text-amber-400">
                المرشحون المتقدمون لإعلانات التوظيف ({jobAds.length} إعلانات):
              </h4>
              {jobAds.map((ad) => (
                <div
                  key={ad.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                    <strong className="text-white">
                      إعلان وظيفة: {ad.roleTitleAr} — اليوم {ad.postedAtDay} ({ad.postedAtTimeLabel})
                    </strong>
                    <span className="text-slate-400">
                      رسوم الإعلان المسددة: <strong className="font-mono-num text-rose-300">{formatEGP(ad.adCostPiastres)}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    {ad.candidates.map((cand) => (
                      <div
                        key={cand.id}
                        className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-between gap-2.5"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <strong className="text-white">{cand.name}</strong>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                cand.experienceLevel === 'EXPERT'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : cand.experienceLevel === 'INTERMEDIATE'
                                    ? 'bg-sky-500/20 text-sky-300'
                                    : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {cand.experienceLabelAr}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{cand.summaryAr}</p>
                          {(cand.role === 'COURIER_MOTO' ||
                            cand.role === 'COURIER_VAN') && (
                            <div
                              className={`px-2 py-1 rounded text-[10px] font-bold border ${
                                cand.ownsPersonalMotorcycle
                                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                  : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                              }`}
                            >
                              {cand.ownsPersonalMotorcycle
                                ? '🏍️ يمتلك موتوسيكل شخصي (0.00 ج.م إيجار مركبة على الشركة)'
                                : '🔑 بدون موتوسيكل (يحتاج تخصيص مركبة من متجر/أسطول الشركة)'}
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-1.5 p-2 rounded bg-slate-950 text-[11px]">
                            <div>
                              <span className="text-slate-400 block">راتب دورة 8 أيام</span>
                              <strong className="font-mono-num text-amber-300">
                                {formatEGP(cand.salaryPerCyclePiastres)}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block">الكفاءة / الخطأ</span>
                              <strong className="font-mono-num text-emerald-400">
                                {cand.expectedEfficiency}% · {cand.expectedErrorRatePercent}%
                              </strong>
                            </div>
                          </div>

                          {/* Role-Specific Candidate Skills */}
                          <div className="space-y-1 pt-1">
                            {cand.skills.map((sk) => (
                              <div
                                key={sk.id}
                                className="flex items-center justify-between text-[11px]"
                              >
                                <span className="text-slate-400">{sk.labelAr}</span>
                                <strong className="font-mono-num text-slate-200">
                                  {sk.score}%
                                </strong>
                              </div>
                            ))}
                          </div>
                        </div>

                        {onHireCandidate && (
                          <button
                            type="button"
                            disabled={cand.hired}
                            onClick={() => onHireCandidate(ad.id, cand.id)}
                            className="w-full py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs cursor-pointer"
                          >
                            {cand.hired ? 'تم التعيين ✓' : 'تعيين المرشح في الشركة'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Employees Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {state.employees.map((emp) => {
          const netPayable = calculateEmployeeNetPayablePiastres(emp);
          const eightDaySalary = Math.round((emp.baseMonthlySalaryPiastres / 30) * 8);
          const perfScore = emp.performanceScore ?? emp.efficiency;
          const isLowPerf = perfScore < 39;
          const isTerminated = emp.status === 'TERMINATED';
          const penaltyKey = `PENALTY-${emp.id}-DELAYCOUNT-${emp.attributedDelaysCount}`;
          const canApplyPenalty =
            !isTerminated &&
            emp.attributedDelaysCount > 0 &&
            !state.executedDecisionIds.includes(penaltyKey);

          return (
            <div
              key={emp.id}
              className={`p-4 rounded-xl bg-slate-900 border space-y-3 text-xs ${
                isTerminated
                  ? 'border-slate-800 opacity-65'
                  : isLowPerf
                    ? 'border-rose-500/70'
                    : 'border-slate-800'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{emp.name}</h3>
                    {isLowPerf && !isTerminated && (
                      <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold">
                        تحذير تدني أداء (&lt;39%)
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 mt-0.5">
                    {emp.roleTitleAr} · راتب كل 8 أيام:{' '}
                    <strong className="font-mono-num text-amber-300">
                      {formatEGP(eightDaySalary)}
                    </strong>
                  </p>
                </div>
                <span
                  className={`font-bold ${
                    isTerminated
                      ? 'text-slate-500'
                      : emp.status === 'IN_TRAINING'
                        ? 'text-sky-400'
                        : 'text-emerald-400'
                  }`}
                >
                  {STATUS_LABELS_AR[emp.status]}
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                <div>
                  <span className="text-slate-400 block">الراتب الشهري المكافئ</span>
                  <strong className="font-mono-num text-white mt-0.5 block">
                    {formatEGP(emp.baseMonthlySalaryPiastres)}
                  </strong>
                  {emp.futureMonthlySalaryPiastres && (
                    <span className="text-[10px] text-amber-400 block">
                      يصبح {formatEGP(emp.futureMonthlySalaryPiastres)} من اليوم{' '}
                      {emp.futureSalaryEffectiveDay}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block">مؤشر الأداء الشامل</span>
                  <strong
                    className={`font-mono-num mt-0.5 block ${
                      isLowPerf ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {perfScore}% (الكفاءة {emp.efficiency}%)
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block">
                    {emp.role === 'ADMIN_ACCOUNTANT'
                      ? 'معالجة الطلبات اليوم'
                      : 'المهام / معدل الخطأ'}
                  </span>
                  <strong className="font-mono-num text-slate-200 mt-0.5 block">
                    {emp.role === 'ADMIN_ACCOUNTANT'
                      ? `${emp.assignedShipmentsToday} / ${emp.dailyCapacity || 8} طلبات`
                      : `${emp.completedTasksCount} مهام · ${emp.errorRatePercent}% خطأ`}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block">حالات التأخير المنسوبة</span>
                  <strong
                    className={`font-mono-num mt-0.5 block ${
                      emp.attributedDelaysCount > 0
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {emp.attributedDelaysCount} حالات
                  </strong>
                </div>
              </div>

              {/* Role-Specific Skills & Performance Factors */}
              {emp.skills && emp.skills.length > 0 && (
                <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/70 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-300 block">
                    المهارات التخصصية للوظيفة:
                  </span>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                    {emp.skills.map((sk) => (
                      <div key={sk.id} className="flex items-center justify-between">
                        <span className="text-slate-400">{sk.labelAr}</span>
                        <strong className="font-mono-num text-amber-300">{sk.score}%</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Positive & Negative Performance Factors */}
              {((emp.performancePositiveFactors && emp.performancePositiveFactors.length > 0) ||
                (emp.performanceNegativeFactors && emp.performanceNegativeFactors.length > 0)) && (
                <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60 space-y-1 text-[11px]">
                  {emp.performancePositiveFactors?.map((pos, idx) => (
                    <div key={idx} className="text-emerald-400">
                      + {pos}
                    </div>
                  ))}
                  {emp.performanceNegativeFactors?.map((neg, idx) => (
                    <div key={idx} className="text-rose-400">
                      − {neg}
                    </div>
                  ))}
                </div>
              )}

              {/* Financial Accruals Row */}
              <div className="grid grid-cols-3 gap-2 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
                <div>
                  <span className="text-slate-400 block">مكافآت مصروفة</span>
                  <strong className="font-mono-num text-emerald-400">
                    {formatEGP(emp.bonusesPiastres)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block">جزاءات معتمدة</span>
                  <strong className="font-mono-num text-rose-400">
                    {formatEGP(emp.approvedPenaltiesPiastres)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block">صافي المستحقات المتراكمة</span>
                  <strong className="font-mono-num text-amber-400">
                    {formatEGP(netPayable)}
                  </strong>
                </div>
              </div>

              {/* HR Actions Row */}
              {!isTerminated && (
                <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onScheduleSalaryRaise(emp.id, 30000)}
                    disabled={Boolean(emp.futureMonthlySalaryPiastres)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-semibold cursor-pointer whitespace-nowrap"
                  >
                    زيادة الراتب (+300 ج.م/شهر)
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onGrantBonus(emp.id, 7500, 'مكافأة تشجيعية على الأداء والانضباط')
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-700/50 font-semibold cursor-pointer whitespace-nowrap"
                  >
                    مكافأة أداء (75.00 ج.م)
                  </button>

                  <button
                    type="button"
                    onClick={() => onStartTraining(emp.id)}
                    disabled={emp.status === 'IN_TRAINING'}
                    className="px-2.5 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 disabled:opacity-40 text-sky-300 border border-sky-700/50 font-semibold cursor-pointer whitespace-nowrap"
                  >
                    تدريب مهني (120.00 ج.م)
                  </button>

                  <button
                    type="button"
                    onClick={() => onReassignTasks(emp.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer whitespace-nowrap"
                  >
                    إعادة توزيع المهام
                  </button>

                  <button
                    type="button"
                    onClick={() => onConductInvestigation(emp.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold cursor-pointer whitespace-nowrap"
                  >
                    تحقيق إداري
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onApplyPenalty(
                        emp.id,
                        `جزاء إداري معتمد بسبب ${emp.attributedDelaysCount} حالة تأخير مسجلة`
                      )
                    }
                    disabled={!canApplyPenalty}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 disabled:opacity-40 text-rose-300 border border-rose-800/50 font-semibold cursor-pointer whitespace-nowrap"
                  >
                    جزاء لائحي (50.00 ج.م)
                  </button>

                  {/* Section 6: Low Performance (<39%) Review & Termination Controls */}
                  {isLowPerf && onReviewEmployee && (
                    <button
                      type="button"
                      onClick={() => onReviewEmployee(emp.id)}
                      disabled={Boolean(emp.reviewCompleted)}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-400 text-slate-950 font-bold cursor-pointer whitespace-nowrap"
                    >
                      {emp.reviewCompleted
                        ? 'تمت مراجعة الأداء ✓'
                        : 'مراجعة الموظف (أداء < 39%)'}
                    </button>
                  )}

                  {isLowPerf && emp.reviewCompleted && onTerminateEmployee && (
                    <button
                      type="button"
                      onClick={() => onTerminateEmployee(emp.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer whitespace-nowrap"
                    >
                      إنهاء الخدمة رسمياً
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

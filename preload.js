const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('api', {
  app: {
    getDataPath: () => invoke('app:getDataPath'),
  },
  company: {
    create: (data) => invoke('company:create', data),
    getAll: () => invoke('company:getAll'),
    getById: (id) => invoke('company:getById', id),
    update: (data) => invoke('company:update', data),
    delete: (id) => invoke('company:delete', id),
    verifyPassword: (data) => invoke('company:verifyPassword', data),
    setDefaultGstRegistration: (company_id, gst_registration_id) =>
      invoke('company:setDefaultGstRegistration', { company_id, gst_registration_id }),
    getDefaultGstRegistration: (company_id) =>
      invoke('company:getDefaultGstRegistration', company_id),
  },
  taxUnits: {
    create: (data) => invoke('taxUnits:create', data),
    getAll: (company_id) => invoke('taxUnits:getAll', company_id),
    getById: (id) => invoke('taxUnits:getById', id),
    update: (data) => invoke('taxUnits:update', data),
    delete: (id) => invoke('taxUnits:delete', id),
  },
  priceList: {
    create: (data) => invoke('priceList:create', data),
    getAll: (company_id) => invoke('priceList:getAll', company_id),
    getById: (id) => invoke('priceList:getById', id),
    update: (data) => invoke('priceList:update', data),
    delete: (id) => invoke('priceList:delete', id),
  },
  priceLevels: {
    get: (company_id) => invoke('priceLevels:get', company_id),
    save: (data) => invoke('priceLevels:save', data),
    delete: (company_id) => invoke('priceLevels:delete', company_id),
  },
  fy: {
    create: (data) => invoke('fy:create', data),
    getAll: (company_id) => invoke('fy:getAll', company_id),
    getById: (id) => invoke('fy:getById', id),
    setActive: (fy_id, company_id) => invoke('fy:setActive', { fy_id, company_id }),
    delete: (id) => invoke('fy:delete', id),
  },
  group: {
    create: (data) => invoke('group:create', data),
    getAll: (company_id) => invoke('group:getAll', company_id),
    getById: (id) => invoke('group:getById', id),
    update: (data) => invoke('group:update', data),
    delete: (id) => invoke('group:delete', id),
    getTree: (company_id) => invoke('group:getTree', company_id),
  },
  ledger: {
    create: (data) => invoke('ledger:create', data),
    getAll: (company_id) => invoke('ledger:getAll', company_id),
    getById: (id) => invoke('ledger:getById', id),
    update: (data) => invoke('ledger:update', data),
    delete: (id) => invoke('ledger:delete', id),
    getByGroup: (company_id, groupId) =>
      invoke('ledger:getByGroup', { company_id, group_id: groupId }),
    updateCreditLimits: (company_id, rows) =>
      invoke('ledger:updateCreditLimits', { company_id, rows }),
    getTotalOpeningBalance: (company_id) => invoke('ledger:getTotalOpeningBalance', company_id),
  },
  costCentre: {
    create: (data) => invoke('costCentre:create', data),
    getAll: (company_id) => invoke('costCentre:getAll', company_id),
    getById: (id) => invoke('costCentre:getById', id),
    update: (data) => invoke('costCentre:update', data),
    delete: (id) => invoke('costCentre:delete', id),
    getTree: (company_id) => invoke('costCentre:getTree', company_id),
  },
  costCategory: {
    create: (data) => invoke('costCategory:create', data),
    getAll: (company_id) => invoke('costCategory:getAll', company_id),
    getById: (id) => invoke('costCategory:getById', id),
    update: (data) => invoke('costCategory:update', data),
    delete: (id) => invoke('costCategory:delete', id),
  },
  budget: {
    create: (data) => invoke('budget:create', data),
    getAll: (company_id) => invoke('budget:getAll', company_id),
    getById: (id) => invoke('budget:getById', id),
    update: (data) => invoke('budget:update', data),
    delete: (id) => invoke('budget:delete', id),
  },
  scenario: {
    create: (data) => invoke('scenario:create', data),
    getAll: (company_id) => invoke('scenario:getAll', company_id),
    getById: (id) => invoke('scenario:getById', id),
    update: (data) => invoke('scenario:update', data),
    delete: (id) => invoke('scenario:delete', id),
  },
  exciseDutyClassification: {
    create: (data) => invoke('exciseDutyClassification:create', data),
    getAll: (company_id) => invoke('exciseDutyClassification:getAll', company_id),
    getById: (id) => invoke('exciseDutyClassification:getById', id),
    update: (data) => invoke('exciseDutyClassification:update', data),
    delete: (id) => invoke('exciseDutyClassification:delete', id),
  },
  exciseBook: {
    create: (data) => invoke('exciseBook:create', data),
    getAll: (company_id) => invoke('exciseBook:getAll', company_id),
    getById: (id) => invoke('exciseBook:getById', id),
    update: (data) => invoke('exciseBook:update', data),
    delete: (id) => invoke('exciseBook:delete', id),
  },
  merchantProfile: {
    create: (data) => invoke('merchantProfile:create', data),
    getAll: (company_id) => invoke('merchantProfile:getAll', company_id),
    getById: (id) => invoke('merchantProfile:getById', id),
    update: (data) => invoke('merchantProfile:update', data),
    delete: (id) => invoke('merchantProfile:delete', id),
  },
  unit: {
    create: (data) => invoke('unit:create', data),
    getAll: (company_id) => invoke('unit:getAll', company_id),
    getSimpleUnits: (company_id) => invoke('unit:getSimpleUnits', company_id),
    getById: (id) => invoke('unit:getById', id),
    update: (data) => invoke('unit:update', data),
    delete: (id) => invoke('unit:delete', id),
  },
  stockGroup: {
    create: (data) => invoke('stockGroup:create', data),
    getAll: (company_id) => invoke('stockGroup:getAll', company_id),
    getById: (id) => invoke('stockGroup:getById', id),
    update: (data) => invoke('stockGroup:update', data),
    delete: (id) => invoke('stockGroup:delete', id),
    getTree: (company_id) => invoke('stockGroup:getTree', company_id),
  },
  stockCategory: {
    create: (data) => invoke('stockCategory:create', data),
    getAll: (company_id) => invoke('stockCategory:getAll', company_id),
    getById: (id) => invoke('stockCategory:getById', id),
    update: (data) => invoke('stockCategory:update', data),
    delete: (id) => invoke('stockCategory:delete', id),
  },
  stockItem: {
    create: (data) => invoke('stockItem:create', data),
    getAll: (company_id) => invoke('stockItem:getAll', company_id),
    getById: (id) => invoke('stockItem:getById', id),
    update: (data) => invoke('stockItem:update', data),
    delete: (id) => invoke('stockItem:delete', id),
    getByGroup: ({ company_id, group_id }) =>
      invoke('stockItem:getByGroup', { company_id, group_id }),
    getByCategory: ({ company_id, category_id }) =>
      invoke('stockItem:getByCategory', { company_id, category_id }),
    getStockBalances: (company_id) => invoke('stockItem:getStockBalances', company_id),
    getStockBalancesByGodown: ({ company_id, item_id }) =>
      invoke('stockItem:getStockBalancesByGodown', { company_id, item_id }),
    getLastPurchaseRate: ({ company_id, item_id }) =>
      invoke('stockItem:getLastPurchaseRate', { company_id, item_id }),
    getActiveBatches: ({ company_id, item_id }) =>
      invoke('stockItem:getActiveBatches', { company_id, item_id }),
  },
  godown: {
    create: (data) => invoke('godown:create', data),
    getAll: (company_id) => invoke('godown:getAll', company_id),
    getById: (id) => invoke('godown:getById', id),
    update: (data) => invoke('godown:update', data),
    delete: (id) => invoke('godown:delete', id),
    getTree: (company_id) => invoke('godown:getTree', company_id),
  },
  voucher: {
    create: (data) => invoke('voucher:create', data),
    getAll: (company_id, fy_id) => invoke('voucher:getAll', { company_id, fy_id }),
    getById: (id) => invoke('voucher:getById', id),
    update: (data) => invoke('voucher:update', data),
    delete: (id) => invoke('voucher:delete', id),
    cancel: (id) => invoke('voucher:cancel', id),
    getDaybook: (company_id, fy_id, from_date, to_date) =>
      invoke('voucher:getDaybook', { company_id, fy_id, from_date, to_date }),
    getByType: (company_id, fy_id, type) =>
      invoke('voucher:getByType', { company_id, fy_id, voucher_type: type }),
    getByLedger: (company_id, fy_id, ledgerId) =>
      invoke('voucher:getByLedger', { company_id, fy_id, ledger_id: ledgerId }),
    getNextNumber: (company_id, fy_id, type) =>
      invoke('voucher:getNextNumber', { company_id, fy_id, voucher_type: type }),
    getLedgerBalance: (ledger_id, company_id, fy_id) =>
      invoke('voucher:getLedgerBalance', { ledger_id, company_id, fy_id }),
    searchLedgers: (company_id, searchTerm) =>
      invoke('voucher:searchLedgers', { company_id, searchTerm }),
    getPendingBills: (ledger_id, company_id, fy_id) =>
      invoke('voucher:getPendingBills', { ledger_id, company_id, fy_id }),
  },
  report: {
    trialBalance: (company_id, fy_id) => invoke('report:trialBalance', { company_id, fy_id }),
    balanceSheet: (company_id, fy_id) => invoke('report:balanceSheet', { company_id, fy_id }),
    profitLoss: (company_id, fy_id, from_date, to_date) =>
      invoke('report:profitLoss', { company_id, fy_id, from_date, to_date }),
    ledgerReport: (company_id, fy_id, ledger_id, from_date, to_date) =>
      invoke('report:ledgerReport', { company_id, fy_id, ledger_id, from_date, to_date }),
    cashBook: (company_id, fy_id, from_date, to_date) =>
      invoke('report:cashBook', { company_id, fy_id, from_date, to_date }),
    bankBook: (company_id, fy_id, ledger_id, from_date, to_date) =>
      invoke('report:bankBook', { company_id, fy_id, ledger_id, from_date, to_date }),
    daybook: (company_id, fy_id, from_date, to_date) =>
      invoke('report:daybook', { company_id, fy_id, from_date, to_date }),
    billsReceivable: (company_id, fy_id) => invoke('report:billsReceivable', { company_id, fy_id }),
    billsPayable: (company_id, fy_id) => invoke('report:billsPayable', { company_id, fy_id }),
    ledgerOutstandings: (company_id, fy_id, ledger_id) =>
      invoke('report:ledgerOutstandings', { company_id, fy_id, ledger_id }),
    groupOutstandings: (company_id, fy_id, group_id) =>
      invoke('report:groupOutstandings', { company_id, fy_id, group_id }),
    billVouchers: (company_id, fy_id, ledger_id, bill_name) =>
      invoke('report:billVouchers', { company_id, fy_id, ledger_id, bill_name }),
    interestReceivable: (company_id, fy_id, params) =>
      invoke('report:interestReceivable', { company_id, fy_id, params }),
    interestPayable: (company_id, fy_id, params) =>
      invoke('report:interestPayable', { company_id, fy_id, params }),
    groupInterest: (company_id, fy_id, params) =>
      invoke('report:groupInterest', { company_id, fy_id, params }),
    ledgerInterest: (company_id, fy_id, params) =>
      invoke('report:ledgerInterest', { company_id, fy_id, params }),
    billWiseInterest: (company_id, fy_id, params) =>
      invoke('report:billWiseInterest', { company_id, fy_id, params }),
    cashFlow: (company_id, fy_id, from_date, to_date) =>
      invoke('report:cashFlow', { company_id, fy_id, from_date, to_date }),
    fundsFlow: (company_id, fy_id, from_date, to_date) =>
      invoke('report:fundsFlow', { company_id, fy_id, from_date, to_date }),
    stockSummary: (company_id, fy_id, as_on_date, method) =>
      invoke('report:stockSummary', { company_id, fy_id, as_on_date, method }),
    stockGroupItems: (company_id, fy_id, group_id) =>
      invoke('report:stockGroupItems', { company_id, fy_id, group_id }),
    stockItemMonthly: (company_id, fy_id, item_id) =>
      invoke('report:stockItemMonthly', { company_id, fy_id, item_id }),
    batchItems: (company_id) => invoke('report:batchItems', { company_id }),
    batchBalances: (company_id, item_id) => invoke('report:batchBalances', { company_id, item_id }),
    trackingNumbers: (company_id, item_id) =>
      invoke('report:trackingNumbers', { company_id, item_id }),
    orderNumbers: (company_id, item_id) => invoke('report:orderNumbers', { company_id, item_id }),
    partyOrders: (company_id, party_ledger_id, voucher_type) =>
      invoke('report:partyOrders', { company_id, party_ledger_id, voucher_type }),
    partyTrackingNumbers: (company_id, party_ledger_id, voucher_type) =>
      invoke('report:partyTrackingNumbers', { company_id, party_ledger_id, voucher_type }),
    pendingVoucherItems: (company_id, voucher_id, mode) =>
      invoke('report:pendingVoucherItems', { company_id, voucher_id, mode }),
    batchesForItem: (company_id, item_id) =>
      invoke('report:batchesForItem', { company_id, item_id }),
    batchVouchers: (company_id, fy_id, item_id, batch, from_date, to_date) =>
      invoke('report:batchVouchers', { company_id, fy_id, item_id, batch, from_date, to_date }),
    godownItems: (company_id, fy_id, godown_id, as_on_date) =>
      invoke('report:godownItems', { company_id, fy_id, godown_id, as_on_date }),
    godownItemMonthly: (company_id, fy_id, godown_id, item_id) =>
      invoke('report:godownItemMonthly', { company_id, fy_id, godown_id, item_id }),
    godownVouchers: (company_id, fy_id, godown_id, item_id, from_date, to_date) =>
      invoke('report:godownVouchers', {
        company_id,
        fy_id,
        godown_id,
        item_id,
        from_date,
        to_date,
      }),
    stockItemVouchers: (company_id, fy_id, item_id, from_date, to_date) =>
      invoke('report:stockItemVouchers', { company_id, fy_id, item_id, from_date, to_date }),
    stockCategoryItems: (company_id, fy_id, category_id) =>
      invoke('report:stockCategoryItems', { company_id, fy_id, category_id }),
    inventoryRegisterMonthly: (company_id, fy_id, voucher_type) =>
      invoke('report:inventoryRegisterMonthly', { company_id, fy_id, voucher_type }),
    inventoryRegisterVouchers: (company_id, fy_id, voucher_type, from_date, to_date) =>
      invoke('report:inventoryRegisterVouchers', {
        company_id,
        fy_id,
        voucher_type,
        from_date,
        to_date,
      }),
    ratioAnalysis: (company_id, fy_id) => invoke('report:ratioAnalysis', { company_id, fy_id }),
    groupSummaryDrilldown: (company_id, fy_id, group_id) =>
      invoke('report:groupSummaryDrilldown', { company_id, fy_id, group_id }),
    ledgerMonthlySummary: (company_id, fy_id, ledger_id) =>
      invoke('report:ledgerMonthlySummary', { company_id, fy_id, ledger_id }),
    run: (reportId, params) => invoke('report:run', { reportId, params }),
    getSavedViews: (company_id) => invoke('report:getSavedViews', { company_id }),
    saveView: (payload) => invoke('report:saveView', payload),
    deleteSavedView: (id) => invoke('report:deleteSavedView', { id }),
    godownSummary: (company_id, fy_id, as_on_date) =>
      invoke('report:godownSummary', { company_id, fy_id, as_on_date }),
    stockAgeing: (company_id, fy_id, as_on_date) =>
      invoke('report:stockAgeing', { company_id, fy_id, as_on_date }),
    movementAnalysis: (company_id, fy_id, as_on_date) =>
      invoke('report:movementAnalysis', { company_id, fy_id, as_on_date }),
    reorderStatus: (company_id, fy_id) => invoke('report:reorderStatus', { company_id, fy_id }),
    reorderStatusScoped: (company_id, fy_id, scope_type, scope_id) =>
      invoke('report:reorderStatusScoped', { company_id, fy_id, scope_type, scope_id }),
    orderOutstanding: (company_id, fy_id, type, dimension, selection_id) =>
      invoke('report:orderOutstanding', { company_id, fy_id, type, dimension, selection_id }),
    orderMovements: (company_id, fy_id, type, voucher_id, stock_item_id, order_no) =>
      invoke('report:orderMovements', {
        company_id,
        fy_id,
        type,
        voucher_id,
        stock_item_id,
        order_no,
      }),
    billsPending: (company_id, fy_id, type) =>
      invoke('report:billsPending', { company_id, fy_id, type }),
    costCentreReport: (company_id, fy_id, as_on_date) =>
      invoke('report:costCentreReport', { company_id, fy_id, as_on_date }),
    budgetVsActual: (company_id, fy_id) => invoke('report:budgetVsActual', { company_id, fy_id }),
    // Accounting summaries
    groupSummary: (company_id, fy_id) => invoke('report:groupSummary', { company_id, fy_id }),
    statistics: (company_id, fy_id) => invoke('report:statistics', { company_id, fy_id }),
    statisticsVoucherMonthly: (company_id, fy_id, voucher_type) =>
      invoke('report:statisticsVoucherMonthly', { company_id, fy_id, voucher_type }),
    statisticsVoucherDayList: (company_id, fy_id, voucher_type, from_date, to_date) =>
      invoke('report:statisticsVoucherDayList', {
        company_id,
        fy_id,
        voucher_type,
        from_date,
        to_date,
      }),
    costCategorySummary: (company_id, fy_id) =>
      invoke('report:costCategorySummary', { company_id, fy_id }),
    // Inventory summaries
    stockItemSummary: (company_id, fy_id) =>
      invoke('report:stockItemSummary', { company_id, fy_id }),
    stockGroupSummary: (company_id, fy_id) =>
      invoke('report:stockGroupSummary', { company_id, fy_id }),
    stockCategorySummary: (company_id, fy_id) =>
      invoke('report:stockCategorySummary', { company_id, fy_id }),
    stockGroupAnalysis: (company_id, fy_id) =>
      invoke('report:stockGroupAnalysis', { company_id, fy_id }),
    stockGroupAnalysisItems: (company_id, fy_id, group_id) =>
      invoke('report:stockGroupAnalysisItems', { company_id, fy_id, group_id }),
    stockAgeingAnalysis: (company_id, fy_id, group_id, as_at, fy_start, periods) =>
      invoke('report:stockAgeingAnalysis', {
        company_id,
        fy_id,
        group_id,
        as_at,
        fy_start,
        periods,
      }),
    stockCategoryAnalysis: (company_id, fy_id) =>
      invoke('report:stockCategoryAnalysis', { company_id, fy_id }),
    stockCategoryAnalysisItems: (company_id, fy_id, category_id) =>
      invoke('report:stockCategoryAnalysisItems', { company_id, fy_id, category_id }),
    stockItemAnalysis: (company_id, fy_id) =>
      invoke('report:stockItemAnalysis', { company_id, fy_id }),
    groupAnalysis: (company_id, fy_id, group_id) =>
      invoke('report:groupAnalysis', { company_id, fy_id, group_id }),
    ledgerAnalysis: (company_id, fy_id, ledger_id) =>
      invoke('report:ledgerAnalysis', { company_id, fy_id, ledger_id }),
    groupItemVouchers: (company_id, fy_id, group_id, item_id) =>
      invoke('report:groupItemVouchers', { company_id, fy_id, group_id, item_id }),
    ledgerItemVouchers: (company_id, fy_id, ledger_id, item_id) =>
      invoke('report:ledgerItemVouchers', { company_id, fy_id, ledger_id, item_id }),
    transferAnalysis: (company_id, fy_id, voucher_type) =>
      invoke('report:transferAnalysis', { company_id, fy_id, voucher_type }),
    transferItemVouchers: (company_id, fy_id, voucher_type, item_id) =>
      invoke('report:transferItemVouchers', { company_id, fy_id, voucher_type, item_id }),
    costEstimation: (company_id, fy_id, group_id) =>
      invoke('report:costEstimation', { company_id, fy_id, group_id }),
    itemCostAnalysis: (company_id, fy_id, mode, ref_id) =>
      invoke('report:itemCostAnalysis', { company_id, fy_id, mode, ref_id }),
    jobWorkAnalysis: (company_id, fy_id, cc_id) =>
      invoke('report:jobWorkAnalysis', { company_id, fy_id, cc_id }),
    jobWorkOrders: (company_id, fy_id, direction) =>
      invoke('report:jobWorkOrders', { company_id, fy_id, direction }),
    jobWorkComponents: (company_id, fy_id, direction) =>
      invoke('report:jobWorkComponents', { company_id, fy_id, direction }),
    jobWorkOrderVouchers: (company_id, fy_id, voucher_type, from_date, to_date) =>
      invoke('report:jobWorkOrderVouchers', {
        company_id,
        fy_id,
        voucher_type,
        from_date,
        to_date,
      }),
    jobWorkStock: (company_id, fy_id, mode) =>
      invoke('report:jobWorkStock', { company_id, fy_id, mode }),
    jobWorkVariance: (company_id, fy_id, kind, direction) =>
      invoke('report:jobWorkVariance', { company_id, fy_id, kind, direction }),
    jobWorkAnnexure: (company_id, fy_id, annexure, excise_unit_id) =>
      invoke('report:jobWorkAnnexure', { company_id, fy_id, annexure, excise_unit_id }),
    jobWorkAgeing: (company_id, fy_id, group_id, as_at, fy_start, direction) =>
      invoke('report:jobWorkAgeing', { company_id, fy_id, group_id, as_at, fy_start, direction }),
    stockQuery: (company_id, fy_id, item_id) =>
      invoke('report:stockQuery', { company_id, fy_id, item_id }),
    // Payroll reports
    payslipReport: (company_id, fy_id) => invoke('report:payslipReport', { company_id, fy_id }),
    salaryStatement: (company_id, fy_id) => invoke('report:salaryStatement', { company_id, fy_id }),
    salaryRegister: (company_id, fy_id) => invoke('report:salaryRegister', { company_id, fy_id }),
    attendanceReport: (company_id, fy_id) =>
      invoke('report:attendanceReport', { company_id, fy_id }),
    payHeadBreakup: (company_id, fy_id) => invoke('report:payHeadBreakup', { company_id, fy_id }),
    pfReport: (company_id, fy_id) => invoke('report:pfReport', { company_id, fy_id }),
    esiReport: (company_id, fy_id) => invoke('report:esiReport', { company_id, fy_id }),
    professionalTax: (company_id, fy_id) => invoke('report:professionalTax', { company_id, fy_id }),
    gratuity: (company_id, fy_id) => invoke('report:gratuity', { company_id, fy_id }),
    paySlip: (company_id, fy_id) => invoke('report:paySlip', { company_id, fy_id }),
    paySlipDetail: (company_id, fy_id, employee_id) =>
      invoke('report:paySlipDetail', { company_id, fy_id, employee_id }),
    paySheet: (company_id, fy_id) => invoke('report:paySheet', { company_id, fy_id }),
    attendanceSheet: (company_id, fy_id) => invoke('report:attendanceSheet', { company_id, fy_id }),
    paymentAdvice: (company_id, fy_id) => invoke('report:paymentAdvice', { company_id, fy_id }),
    employeesWithoutEmail: (company_id, fy_id) =>
      invoke('report:employeesWithoutEmail', { company_id, fy_id }),
    payrollStatement: (company_id, fy_id) =>
      invoke('report:payrollStatement', { company_id, fy_id }),
    employeePayHeadBreakup: (company_id, fy_id) =>
      invoke('report:employeePayHeadBreakup', { company_id, fy_id }),
    payHeadEmployeeBreakup: (company_id, fy_id) =>
      invoke('report:payHeadEmployeeBreakup', { company_id, fy_id }),
    employeeProfile: (company_id, fy_id) => invoke('report:employeeProfile', { company_id, fy_id }),
    employeeHeadCount: (company_id, fy_id) =>
      invoke('report:employeeHeadCount', { company_id, fy_id }),
    journalRegister: (company_id, fy_id) => invoke('report:journalRegister', { company_id, fy_id }),
    memorandumRegister: (company_id, fy_id) =>
      invoke('report:memorandumRegister', { company_id, fy_id }),
    reversingJournalRegister: (company_id, fy_id) =>
      invoke('report:reversingJournalRegister', { company_id, fy_id }),
    debitNoteRegister: (company_id, fy_id) =>
      invoke('report:debitNoteRegister', { company_id, fy_id }),
    creditNoteRegister: (company_id, fy_id) =>
      invoke('report:creditNoteRegister', { company_id, fy_id }),
    purchaseRegister: (company_id, fy_id) =>
      invoke('report:purchaseRegister', { company_id, fy_id }),
    salesRegister: (company_id, fy_id) => invoke('report:salesRegister', { company_id, fy_id }),
    contraRegister: (company_id, fy_id) => invoke('report:contraRegister', { company_id, fy_id }),
    paymentRegister: (company_id, fy_id) => invoke('report:paymentRegister', { company_id, fy_id }),
    receiptRegister: (company_id, fy_id) => invoke('report:receiptRegister', { company_id, fy_id }),
    paymentRegisterVouchers: (company_id, fy_id, from_date, to_date) =>
      invoke('report:paymentRegisterVouchers', { company_id, fy_id, from_date, to_date }),
    receiptRegisterVouchers: (company_id, fy_id, from_date, to_date) =>
      invoke('report:receiptRegisterVouchers', { company_id, fy_id, from_date, to_date }),
    contraRegisterVouchers: (company_id, fy_id, from_date, to_date) =>
      invoke('report:contraRegisterVouchers', { company_id, fy_id, from_date, to_date }),
    salesRegisterVouchers: (company_id, fy_id, from_date, to_date) =>
      invoke('report:salesRegisterVouchers', { company_id, fy_id, from_date, to_date }),
    purchaseRegisterVouchers: (company_id, fy_id, from_date, to_date) =>
      invoke('report:purchaseRegisterVouchers', { company_id, fy_id, from_date, to_date }),
    journalRegisterVouchers: (company_id, fy_id, from_date, to_date) =>
      invoke('report:journalRegisterVouchers', { company_id, fy_id, from_date, to_date }),
    memorandumRegisterVouchers: (company_id, fy_id, from_date, to_date) =>
      invoke('report:memorandumRegisterVouchers', { company_id, fy_id, from_date, to_date }),
    reversingJournalRegisterVouchers: (company_id, fy_id, from_date, to_date) =>
      invoke('report:reversingJournalRegisterVouchers', { company_id, fy_id, from_date, to_date }),
    debitNoteRegisterVouchers: (company_id, fy_id, from_date, to_date) =>
      invoke('report:debitNoteRegisterVouchers', { company_id, fy_id, from_date, to_date }),
    creditNoteRegisterVouchers: (company_id, fy_id, from_date, to_date) =>
      invoke('report:creditNoteRegisterVouchers', { company_id, fy_id, from_date, to_date }),
  },
  banking: {
    getUnreconciled: (company_id, fy_id, ledger_id) =>
      invoke('banking:getUnreconciled', { company_id, fy_id, ledger_id }),
    reconcile: (data) => invoke('banking:reconcile', data),
    unreconcile: (data) => invoke('banking:unreconcile', data),
    getStatement: (company_id, fy_id, ledger_id, from_date, to_date) =>
      invoke('banking:getStatement', { company_id, fy_id, ledger_id, from_date, to_date }),
    getSummary: (company_id, fy_id, ledger_id) =>
      invoke('banking:getSummary', { company_id, fy_id, ledger_id }),
  },
  auditTrail: {
    getAll: (company_id, limit) => invoke('auditTrail:getAll', { company_id, limit }),
    getByEntity: (company_id, entity_type, entity_id) =>
      invoke('auditTrail:getByEntity', { company_id, entity_type, entity_id }),
    verifyChain: (company_id) => invoke('auditTrail:verifyChain', { company_id }),
  },
  currency: {
    create: (data) => invoke('currency:create', data),
    getAll: (company_id) => invoke('currency:getAll', company_id),
    getById: (id) => invoke('currency:getById', id),
    update: (data) => invoke('currency:update', data),
    delete: (id) => invoke('currency:delete', id),
    setDefault: (company_id, id) => invoke('currency:setDefault', { company_id, id }),
  },
  voucherType: {
    create: (data) => invoke('voucherType:create', data),
    getAll: (company_id) => invoke('voucherType:getAll', company_id),
    getById: (id) => invoke('voucherType:getById', id),
    update: (data) => invoke('voucherType:update', data),
    delete: (id) => invoke('voucherType:delete', id),
    getConfig: (id) => invoke('voucherType:getConfig', id),
    updateConfig: (data) => invoke('voucherType:updateConfig', data),
  },
  gstRegistration: {
    create: (data) => invoke('gstRegistration:create', data),
    getAll: (company_id) => invoke('gstRegistration:getAll', company_id),
    getById: (id) => invoke('gstRegistration:getById', id),
    update: (data) => invoke('gstRegistration:update', data),
    delete: (id) => invoke('gstRegistration:delete', id),
  },
  gstClassification: {
    create: (data) => invoke('gstClassification:create', data),
    getAll: (company_id) => invoke('gstClassification:getAll', company_id),
    getById: (id) => invoke('gstClassification:getById', id),
    update: (data) => invoke('gstClassification:update', data),
    delete: (id) => invoke('gstClassification:delete', id),
  },
  tcsNatureOfGoods: {
    create: (data) => invoke('tcsNatureOfGoods:create', data),
    getAll: (company_id) => invoke('tcsNatureOfGoods:getAll', company_id),
    getById: (id) => invoke('tcsNatureOfGoods:getById', id),
    update: (data) => invoke('tcsNatureOfGoods:update', data),
    delete: (id) => invoke('tcsNatureOfGoods:delete', id),
  },
  tdsNatureOfPayment: {
    create: (data) => invoke('tdsNatureOfPayment:create', data),
    getAll: (company_id) => invoke('tdsNatureOfPayment:getAll', company_id),
    getById: (id) => invoke('tdsNatureOfPayment:getById', id),
    update: (data) => invoke('tdsNatureOfPayment:update', data),
    delete: (id) => invoke('tdsNatureOfPayment:delete', id),
  },
  gst: {
    computeTax: (payload) => invoke('gst:computeTax', payload),
    generateGSTR1: (data) => invoke('gst:generateGSTR1', data),
    getGSTR1: (data) => invoke('gst:getGSTR1', data),
    generateGSTR3B: (data) => invoke('gst:generateGSTR3B', data),
    getGSTR3B: (data) => invoke('gst:getGSTR3B', data),
    getHSNRates: (cid) => invoke('gst:getHSNRates', cid),
    upsertHSNRate: (data) => invoke('gst:upsertHSNRate', data),
    deleteHSNRate: (data) => invoke('gst:deleteHSNRate', data),
    getAnnualComputation: (data) => invoke('gst:getAnnualComputation', data),
    getGSTR1Reconciliation: (data) => invoke('gst:getGSTR1Reconciliation', data),
    getRegistrationResolution: (data) => invoke('gst:getRegistrationResolution', data),
    getGSTR2AReconciliation: (data) => invoke('gst:getGSTR2AReconciliation', data),
    getGSTR2BReconciliation: (data) => invoke('gst:getGSTR2BReconciliation', data),
    getReconSummary: (data) => invoke('gst:getReconSummary', data),
    getReconPartySummary: (data) => invoke('gst:getReconPartySummary', data),
    getReconVoucherRegister: (data) => invoke('gst:getReconVoucherRegister', data),
    importGSTR2B: (data) => invoke('gst:importGSTR2B', data),
    importGSTR2A: (data) => invoke('gst:importGSTR2A', data),
    getGSTR1vs3BComparison: (data) => invoke('gst:getGSTR1vs3BComparison', data),
    rebuildCreditLedger: (data) => invoke('gst:rebuildCreditLedger', data),
    getCreditLedger: (data) => invoke('gst:getCreditLedger', data),
    getGSTR9C: (data) => invoke('gst:getGSTR9C', data),
    getIMSInwardSupplies: (data) => invoke('gst:getIMSInwardSupplies', data),
    getChallanReconciliation: (data) => invoke('gst:getChallanReconciliation', data),
    getGstRateSetup: (data) => invoke('gst:getGstRateSetup', data),
    getGstRateSetupTree: (data) => invoke('gst:getGstRateSetupTree', data),
    getGstRateSetupStockTree: (data) => invoke('gst:getGstRateSetupStockTree', data),
    validatePartyGstin: (data) => invoke('gst:validatePartyGstin', data),
    createPartiesFromGstin: (data) => invoke('gst:createPartiesFromGstin', data),
    updatePartyGstDetails: (data) => invoke('gst:updatePartyGstDetails', data),
    getGstOpeningAdvances: (data) => invoke('gst:getGstOpeningAdvances', data),
    createGstOpeningAdvance: (data) => invoke('gst:createGstOpeningAdvance', data),
    deleteGstOpeningAdvance: (data) => invoke('gst:deleteGstOpeningAdvance', data),
    getMarkedVouchers: (data) => invoke('gst:getMarkedVouchers', data),
    getGstAdvancesReport: (data) => invoke('gst:getGstAdvancesReport', data),
    getReverseChargeSupplies: (data) => invoke('gst:getReverseChargeSupplies', data),
    getReturnActivities: (data) => invoke('gst:getReturnActivities', data),
    getReturnStatistics: (data) => invoke('gst:getReturnStatistics', data),
    getReturnVouchers: (data) => invoke('gst:getReturnVouchers', data),
    getNotRelevantBreakdown: (data) => invoke('gst:getNotRelevantBreakdown', data),
    getAnnualSectionBreakdown: (data) => invoke('gst:getAnnualSectionBreakdown', data),
    getAnnualMonthly: (data) => invoke('gst:getAnnualMonthly', data),
  },
  tds: {
    getChallanReconciliation: (data) => invoke('tds:getChallanReconciliation', data),
    getForm26Q: (data) => invoke('tds:getForm26Q', data),
    getForm27Q: (data) => invoke('tds:getForm27Q', data),
    getForm27QDrill: (data) => invoke('tds:getForm27QDrill', data),
    getReturnTransactionBook: (data) => invoke('tds:getReturnTransactionBook', data),
    getOutstandings: (data) => invoke('tds:getOutstandings', data),
    getLedgersWithoutPan: (data) => invoke('tds:getLedgersWithoutPan', data),
  },
  tcs: {
    getChallanReconciliation: (data) => invoke('tcs:getChallanReconciliation', data),
    getForm27EQ: (data) => invoke('tcs:getForm27EQ', data),
    getForm27EQDrill: (data) => invoke('tcs:getForm27EQDrill', data),
    getReturnTransactionBook: (data) => invoke('tcs:getReturnTransactionBook', data),
    getOutstandings: (data) => invoke('tcs:getOutstandings', data),
    getLedgersWithoutPan: (data) => invoke('tcs:getLedgersWithoutPan', data),
    getChallanDetailsOfBuyer: (data) => invoke('tcs:getChallanDetailsOfBuyer', data),
  },
  msme: {
    getForm1: (company_id, fy_id, to_date, group_id) =>
      invoke('msme:getForm1', { company_id, fy_id, to_date, group_id }),
    getPartyList: (company_id, group_id, ledger_id) =>
      invoke('msme:getPartyList', { company_id, group_id, ledger_id }),
    updateDetails: (payload) => invoke('msme:updateDetails', payload),
  },
  payrollStatutory: {
    getSummary: (data) => invoke('payrollStatutory:getSummary', data),
    getPayHeadDetails: (data) => invoke('payrollStatutory:getPayHeadDetails', data),
    getPFForm5: (data) => invoke('payrollStatutory:getPFForm5', data),
    getPFForm10: (data) => invoke('payrollStatutory:getPFForm10', data),
    getPFForm12A: (data) => invoke('payrollStatutory:getPFForm12A', data),
    getPFMonthlyStatement: (data) => invoke('payrollStatutory:getPFMonthlyStatement', data),
    getPFECR: (data) => invoke('payrollStatutory:getPFECR', data),
    getPFForm6A: (data) => invoke('payrollStatutory:getPFForm6A', data),
    getPFForm3A: (data) => invoke('payrollStatutory:getPFForm3A', data),
    getProfessionalTax: (data) => invoke('payrollStatutory:getProfessionalTax', data),
    getGratuity: (data) => invoke('payrollStatutory:getGratuity', data),
  },
  esi: {
    getForm3: (data) => invoke('esi:getForm3', data),
    getMonthlyStatement: (data) => invoke('esi:getMonthlyStatement', data),
    getEReturn: (data) => invoke('esi:getEReturn', data),
    getForm5: (data) => invoke('esi:getForm5', data),
    getForm6: (data) => invoke('esi:getForm6', data),
  },
  nps: {
    getContributionDetails: (data) => invoke('nps:getContributionDetails', data),
    getSummary: (data) => invoke('nps:getSummary', data),
    getPranNotAvailable: (data) => invoke('nps:getPranNotAvailable', data),
  },
  incomeTax: {
    getComputation: (data) => invoke('incomeTax:getComputation', data),
    getSalaryProjection: (data) => invoke('incomeTax:getSalaryProjection', data),
    getChallanReconciliation: (data) => invoke('incomeTax:getChallanReconciliation', data),
    getE24Q: (data) => invoke('incomeTax:getE24Q', data),
    getForm27A: (data) => invoke('incomeTax:getForm27A', data),
    getForm24Q: (data) => invoke('incomeTax:getForm24Q', data),
    getAnnexureI: (data) => invoke('incomeTax:getAnnexureI', data),
    getAnnexureII: (data) => invoke('incomeTax:getAnnexureII', data),
    getForm16: (data) => invoke('incomeTax:getForm16', data),
  },
  master: {
    getMenu: (company_id) => invoke('master:getMenu', company_id),
  },
  pincode: {
    lookup: (pincode) => invoke('pincode:lookup', pincode),
  },
  tallyFeatures: {
    get: (company_id) => invoke('tallyFeatures:get', company_id),
    update: (data) => invoke('tallyFeatures:update', data),
    reset: (company_id) => invoke('tallyFeatures:reset', company_id),
  },
  companyCreationSuccess: {
    get: (company_id) => invoke('companyCreationSuccess:get', company_id),
    update: (data) => invoke('companyCreationSuccess:update', data),
  },
  featureGroup: {
    getAll: () => invoke('featureGroup:getAll'),
    getById: (id) => invoke('featureGroup:getById', id),
  },
  featureItem: {
    getAll: () => invoke('featureItem:getAll'),
    getById: (id) => invoke('featureItem:getById', id),
    getByGroup: (group_id) => invoke('featureItem:getByGroup', group_id),
  },
  companyFeatureValues: {
    get: (company_id) => invoke('companyFeatureValues:get', company_id),
    getByGroup: (company_id, group_id) =>
      invoke('companyFeatureValues:getByGroup', { company_id, group_id }),
    update: (data) => invoke('companyFeatureValues:update', data),
    updateBulk: (company_id, values) =>
      invoke('companyFeatureValues:updateBulk', { company_id, values }),
  },
  attendanceType: {
    create: (data) => invoke('attendanceType:create', data),
    getAll: (company_id) => invoke('attendanceType:getAll', company_id),
    getById: (id) => invoke('attendanceType:getById', id),
    update: (data) => invoke('attendanceType:update', data),
    delete: (id) => invoke('attendanceType:delete', id),
  },
  payHead: {
    create: (data) => invoke('payHead:create', data),
    getAll: (company_id) => invoke('payHead:getAll', company_id),
    getTotalOpeningBalance: (company_id) => invoke('payHead:getTotalOpeningBalance', company_id),
    getById: (id) => invoke('payHead:getById', id),
    update: (data) => invoke('payHead:update', data),
    delete: (id) => invoke('payHead:delete', id),
    getSlabs: (pay_head_id) => invoke('payHead:getSlabs', pay_head_id),
    createSlab: (data) => invoke('payHead:createSlab', data),
    deleteSlab: (id) => invoke('payHead:deleteSlab', id),
    getFormulas: (pay_head_id) => invoke('payHead:getFormulas', pay_head_id),
    createFormula: (data) => invoke('payHead:createFormula', data),
    deleteFormula: (id) => invoke('payHead:deleteFormula', id),
    getGratuitySlabs: (pay_head_id) => invoke('payHead:getGratuitySlabs', pay_head_id),
    createGratuitySlab: (data) => invoke('payHead:createGratuitySlab', data),
    deleteGratuitySlab: (id) => invoke('payHead:deleteGratuitySlab', id),
  },
  salaryStructure: {
    create: (data) => invoke('salaryStructure:create', data),
    createBulk: (company_id, employee_id, effective_from, entries) =>
      invoke('salaryStructure:createBulk', { company_id, employee_id, effective_from, entries }),
    getAll: (company_id) => invoke('salaryStructure:getAll', company_id),
    getById: (id) => invoke('salaryStructure:getById', id),
    getByEmployee: (company_id, employee_id) =>
      invoke('salaryStructure:getByEmployee', { company_id, employee_id }),
    update: (data) => invoke('salaryStructure:update', data),
    delete: (id) => invoke('salaryStructure:delete', id),
  },
  employee: {
    create: (data) => invoke('employee:create', data),
    getAll: (company_id) => invoke('employee:getAll', company_id),
    getById: (id) => invoke('employee:getById', id),
    update: (data) => invoke('employee:update', data),
    delete: (id) => invoke('employee:delete', id),
    getByGroup: (company_id, group_id) => invoke('employee:getByGroup', { company_id, group_id }),
  },
  employeeCategory: {
    create: (data) => invoke('employeeCategory:create', data),
    getAll: (company_id) => invoke('employeeCategory:getAll', company_id),
    getById: (id) => invoke('employeeCategory:getById', id),
    update: (data) => invoke('employeeCategory:update', data),
    delete: (id) => invoke('employeeCategory:delete', id),
  },
  employeeGroup: {
    create: (data) => invoke('employeeGroup:create', data),
    getAll: (company_id) => invoke('employeeGroup:getAll', company_id),
    getById: (id) => invoke('employeeGroup:getById', id),
    update: (data) => invoke('employeeGroup:update', data),
    delete: (id) => invoke('employeeGroup:delete', id),
    getTree: (company_id) => invoke('employeeGroup:getTree', company_id),
  },
  payrollUnit: {
    create: (data) => invoke('payrollUnit:create', data),
    getAll: (company_id) => invoke('payrollUnit:getAll', company_id),
    getById: (id) => invoke('payrollUnit:getById', id),
    update: (data) => invoke('payrollUnit:update', data),
    delete: (id) => invoke('payrollUnit:delete', id),
  },
  physicalStock: {
    create: (data) => invoke('physicalStock:create', data),
    getAll: (company_id) => invoke('physicalStock:getAll', company_id),
    getById: (id) => invoke('physicalStock:getById', id),
    delete: (id) => invoke('physicalStock:delete', id),
    getNextNumber: (company_id) => invoke('physicalStock:getNextNumber', { company_id }),
  },
  attendance: {
    create: (data) => invoke('attendance:create', data),
    getAll: (company_id) => invoke('attendance:getAll', company_id),
    getById: (id) => invoke('attendance:getById', id),
    delete: (id) => invoke('attendance:delete', id),
    getNextNumber: (company_id) => invoke('attendance:getNextNumber', { company_id }),
  },
  companyGstDetails: {
    get: (company_id) => invoke('companyGstDetails:get', company_id),
    save: (data) => invoke('companyGstDetails:save', data),
  },
  payrollStatutoryDetails: {
    get: (company_id) => invoke('payrollStatutoryDetails:get', company_id),
    save: (data) => invoke('payrollStatutoryDetails:save', data),
  },
  serviceTaxDetails: {
    get: (company_id) => invoke('serviceTaxDetails:get', company_id),
    save: (data) => invoke('serviceTaxDetails:save', data),
  },
  exciseRegistrationDetails: {
    get: (company_id) => invoke('exciseRegistrationDetails:get', company_id),
    save: (data) => invoke('exciseRegistrationDetails:save', data),
  },
  vatRegistrationDetails: {
    get: (company_id) => invoke('vatRegistrationDetails:get', company_id),
    save: (data) => invoke('vatRegistrationDetails:save', data),
  },
  companyTdsDetails: {
    get: (company_id) => invoke('companyTdsDetails:get', company_id),
    save: (data) => invoke('companyTdsDetails:save', data),
  },
  companyTcsDetails: {
    get: (company_id) => invoke('companyTcsDetails:get', company_id),
    save: (data) => invoke('companyTcsDetails:save', data),
  },
  companyPanCinDetails: {
    get: (company_id) => invoke('companyPanCinDetails:get', company_id),
    save: (data) => invoke('companyPanCinDetails:save', data),
  },
  ai: {
    getKeyStatus: () => invoke('ai:getKeyStatus'),
    ask: (payload) => invoke('ai:ask', payload),
  },
  automation: {
    getVoucherSchema: () => invoke('automation:getVoucherSchema'),
    validateVoucher: (payload) => invoke('automation:validateVoucher', payload),
    createVoucher: (payload) => invoke('automation:createVoucher', payload),
  },
  pdf: {
    fromHtml: (html, defaultFileName) => invoke('export:htmlToPdf', { html, defaultFileName }),
    toBase64: (html) => invoke('export:htmlToPdfBase64', { html }),
  },
  tally: {
    testConnection: (params) => invoke('tally:testConnection', params),
    preview: (params) => invoke('tally:preview', params),
    importMasters: (params) => invoke('tally:importMasters', params),
    importVouchers: (params) => invoke('tally:importVouchers', params),
    // TallyPrime native-folder (.1800) import
    pickFolder: () => invoke('tally:pickFolder'),
    previewFolder: (params) => invoke('tally:previewFolder', params),
    importFolder: (params) => invoke('tally:importFolder', params),
    // progress events during a folder import; returns an unsubscribe fn
    onImportProgress: (cb) => {
      const listener = (_e, info) => cb(info);
      ipcRenderer.on('tally:folderImportProgress', listener);
      return () => ipcRenderer.removeListener('tally:folderImportProgress', listener);
    },
  },
  eInvoice: {
    getStatus: (company_id) => invoke('eInvoice:getStatus', { company_id }),
    generateFromVoucher: (payload) => invoke('eInvoice:generateFromVoucher', payload),
    getRecords: (company_id) => invoke('eInvoice:getRecords', { company_id }),
    getRecordByIRN: (irn) => invoke('eInvoice:getRecordByIRN', { irn }),
    getByVoucher: (voucher_id) => invoke('eInvoice:getByVoucher', { voucher_id }),
    cancelIRN: (payload) => invoke('eInvoice:cancelIRN', payload),
    syncGSTINFromCP: (gstin) => invoke('eInvoice:syncGSTINFromCP', { gstin }),
    getRejectedIRNs: (date) => invoke('eInvoice:getRejectedIRNs', { date }),
    getB2CQRCode: (params) => invoke('eInvoice:getB2CQRCode', params),
  },
  ewayBill: {
    getStatus: (company_id) => invoke('ewayBill:getStatus', { company_id }),
    generateFromVoucher: (payload) => invoke('ewayBill:generateFromVoucher', payload),
    generateByIrn: (payload) => invoke('ewayBill:generateByIrn', payload),
    cancel: (payload) => invoke('ewayBill:cancel', payload),
    get: (ewb_no) => invoke('ewayBill:get', { ewb_no }),
    getByIrn: (irn) => invoke('ewayBill:getByIrn', { irn }),
    getByVoucher: (voucher_id) => invoke('ewayBill:getByVoucher', { voucher_id }),
    getRecords: (company_id) => invoke('ewayBill:getRecords', { company_id }),
    // full e-Way Bill product surface (writes take a NIC-shaped `body`)
    generate: (body) => invoke('ewayBill:generate', { body }),
    updatePartB: (body) => invoke('ewayBill:updatePartB', { body }),
    generateConsolidated: (body) => invoke('ewayBill:generateConsolidated', { body }),
    reject: (body) => invoke('ewayBill:reject', { body }),
    updateTransporter: (body) => invoke('ewayBill:updateTransporter', { body }),
    extendValidity: (body) => invoke('ewayBill:extendValidity', { body }),
    regenerateConsolidated: (body) => invoke('ewayBill:regenerateConsolidated', { body }),
    initMultiVehicle: (body) => invoke('ewayBill:initMultiVehicle', { body }),
    addMultiVehicle: (body) => invoke('ewayBill:addMultiVehicle', { body }),
    changeMultiVehicle: (body) => invoke('ewayBill:changeMultiVehicle', { body }),
    closeEwb: (body) => invoke('ewayBill:closeEwb', { body }),
    forTransporterByDate: (date) => invoke('ewayBill:forTransporterByDate', { date }),
    forTransporterByState: (state_code, date) =>
      invoke('ewayBill:forTransporterByState', { state_code, date }),
    forTransporterByGstin: (gen_gstin, date) =>
      invoke('ewayBill:forTransporterByGstin', { gen_gstin, date }),
    reportByTransporterAssignedDate: (date, state_code) =>
      invoke('ewayBill:reportByTransporterAssignedDate', { date, state_code }),
    byDate: (date) => invoke('ewayBill:byDate', { date }),
    rejectedByOthers: (date) => invoke('ewayBill:rejectedByOthers', { date }),
    ofOtherParty: (date) => invoke('ewayBill:ofOtherParty', { date }),
    getConsolidated: (trip_sheet_no) => invoke('ewayBill:getConsolidated', { trip_sheet_no }),
    byConsigner: (doc_type, doc_no) => invoke('ewayBill:byConsigner', { doc_type, doc_no }),
    getErrorList: () => invoke('ewayBill:getErrorList'),
    getGstinDetails: (gstin) => invoke('ewayBill:getGstinDetails', { gstin }),
    getTransporterDetails: (trn_no) => invoke('ewayBill:getTransporterDetails', { trn_no }),
    getHsnDetails: (hsncode) => invoke('ewayBill:getHsnDetails', { hsncode }),
    ewayRequest: (payload) => invoke('ewayBill:ewayRequest', payload),
  },
  gstFiling: {
    getStatus: (company_id) => invoke('gstFiling:getStatus', { company_id }),
    prepare: (payload) => invoke('gstFiling:prepare', payload),
    saveToPortal: (payload) => invoke('gstFiling:saveToPortal', payload),
    fileReturn: (payload) => invoke('gstFiling:fileReturn', payload),
    getFilings: (company_id) => invoke('gstFiling:getFilings', { company_id }),
    markAsFiled: (payload) => invoke('gstFiling:markAsFiled', payload),
    updateArn: (payload) => invoke('gstFiling:updateArn', payload),
    getFilingInfo: (payload) => invoke('gstFiling:getFilingInfo', payload),
    requestOtp: (company_id, gstin) => invoke('gstFiling:requestOtp', { company_id, gstin }),
    authenticate: (payload) => invoke('gstFiling:authenticate', payload),
    requestEvc: (company_id) => invoke('gstFiling:requestEvc', { company_id }),
    getReturnStatus: (payload) => invoke('gstFiling:getReturnStatus', payload),
    // GST portal read/download surface — the whole /gstapis catalog.
    portalRequest: (payload) => invoke('gstFiling:portalRequest', payload),
    getSection: (type, section, query) => invoke('gstFiling:getSection', { type, section, query }),
    getSummary: (type, query) => invoke('gstFiling:getSummary', { type, query }),
    retTrack: (query) => invoke('gstFiling:retTrack', { query }),
    publicSearch: (query) => invoke('gstFiling:publicSearch', { query }),
    publicRetTrack: (query) => invoke('gstFiling:publicRetTrack', { query }),
    getPreferences: (query) => invoke('gstFiling:getPreferences', { query }),
    urdDetails: (query) => invoke('gstFiling:urdDetails', { query }),
    urdValidate: (query) => invoke('gstFiling:urdValidate', { query }),
    refreshToken: () => invoke('gstFiling:refreshToken'),
    requestEvcFor: (form_type) => invoke('gstFiling:requestEvcFor', { form_type }),
    logout: () => invoke('gstFiling:logout'),
    // GSTR-2A/2B: download from the portal and import into the reconciliation tables.
    fetch2A: (payload) => invoke('gstFiling:fetch2A', payload),
    fetch2B: (payload) => invoke('gstFiling:fetch2B', payload),
  },
  whatsapp: {
    getStatus: (company_id) => invoke('whatsapp:getStatus', company_id),
    sendInvoice: (payload) => invoke('whatsapp:sendInvoice', payload),
    sendPaymentReminder: (payload) => invoke('whatsapp:sendPaymentReminder', payload),
    sendStatement: (payload) => invoke('whatsapp:sendStatement', payload),
    sendText: (payload) => invoke('whatsapp:sendText', payload),
    sendTemplate: (payload) => invoke('whatsapp:sendTemplate', payload),
    sendDocument: (payload) => invoke('whatsapp:sendDocument', payload),
    getLogs: (payload) => invoke('whatsapp:getLogs', payload),
    importContacts: (payload) => invoke('whatsapp:importContacts', payload),
    getConversations: (company_id) => invoke('whatsapp:getConversations', company_id),
    getConversation: (payload) => invoke('whatsapp:getConversation', payload),
    syncConversation: (payload) => invoke('whatsapp:syncConversation', payload),
    markRead: (payload) => invoke('whatsapp:markRead', payload),
    reply: (payload) => invoke('whatsapp:reply', payload),
    getTemplates: (company_id) => invoke('whatsapp:getTemplates', company_id),
    syncTemplates: (company_id) => invoke('whatsapp:syncTemplates', company_id),
    runCampaign: (payload) => invoke('whatsapp:runCampaign', payload),
    getCampaigns: (company_id) => invoke('whatsapp:getCampaigns', company_id),
  },
});

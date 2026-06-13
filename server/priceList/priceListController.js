const priceListService = require('../priceList/priceListService');

module.exports = {
  create: async (event, data)=>{ 
    return await  priceListService.create(data);
  },
  getAll:    async (event, company_id) =>{
    return await  priceListService.getAll(company_id);
  },
  getById:   async (event, id) => { return await priceListService.getById(id);
  },

  update:    async (event, data)=>{
    return await  priceListService.update(data);
  },
  delete:    async (event, id) =>{ 
    return await  priceListService.delete(id);
  },
}
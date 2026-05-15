let units = [];

const seedDefaultUnits = (company_id) => {
  const defaults = [
    { name: 'Numbers',   symbol: 'Nos',  unit_type: 'Simple', decimal_places: 0 },
    { name: 'Kilograms', symbol: 'Kg',   unit_type: 'Simple', decimal_places: 3 },
    { name: 'Grams',     symbol: 'g',    unit_type: 'Simple', decimal_places: 3 },
    { name: 'Litres',    symbol: 'Ltr',  unit_type: 'Simple', decimal_places: 3 },
    { name: 'Metres',    symbol: 'Mtr',  unit_type: 'Simple', decimal_places: 3 },
    { name: 'Pieces',    symbol: 'Pcs',  unit_type: 'Simple', decimal_places: 0 },
    { name: 'Box',       symbol: 'Box',  unit_type: 'Simple', decimal_places: 0 },
  ];

  defaults.forEach((u,i) => {
    units.push({
        id: Date.now() + i,
        company_id,
        name: u.name,
        symbol: u.symbol,
        formal_name: u.name,
        decimal_places: u.decimal_places,
        unit_quantity_code: null,
        unit_type: u.unit_type,
        is_simple: true,
        is_active: true,
        is_predefined: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    });
  });
};

module.exports = {
    seedDefaultUnits,

    create: async (data) => {
        try {
            const exists = units.find(
               u => u.company_id === data.company_id &&
               u.symbol.toLowercase() === data.symbol.toLowerCase()
            );
            if(exists) return { success: false, error:' Unit already exists' };

            const unit = {
                id: Date.now(),
                company_id: data.company_id,
                name: data.name,
                symbol: data.symbol,
                formal_name: data.formal_name || data.name,
                decimal_places: data.decimal_places || 0,
                unit_quantity_code: data.unit_quantity_code || null,
                unit_type: data.unit_type || 'Simple',
                is_simple: data.unit_type === 'Simple',
                is_active: true,
                is_predefined: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            units.push(unit);
            return { success: true, unit };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    getAll: async (company_id) => {
        try{
            const result = units.filter(u => u.company_id === company_id && u.is_active );
            return { success: true, units: result };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },


    getById: async (id) => {
        try{
            const unit = units.find(u => u.id === id);
            if(!unit) return { success: false, error: 'Unit not found' };
            return { success: true, unit };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    update: async (data) => {
        try {
            const index = units.findIndex(u => u.id === data.id );
            if(index === -1) return { success: false, error: 'Unit not found' };
            if(units[index].is_predefined) return { success: true, error: 'Cannot edit predefined units' };

            units[index] = {...units[index], ...data, updated_at: new Date().toISOString() };
            return { success: true, unit: units[index] };
        } catch (err){
            return { success: false, error: err.message };
        }
    },

    delete: async (id) => {
        try{
            const unit = units.find(u => u.id === id);
            if(!unit) return { success: false, error: 'Unit not found' };
            if(unit.is_predefined) return {success: false, error: 'Cannot delete predefined units' };

            units = units.map(u => u.id === id ? { ...u, is_active: false }: u);
            return { success: true };
        } catch (err){
            return { success: false, error: err.message };
        }
    },
};
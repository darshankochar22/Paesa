let financialYears = [];

module.exports = {
    create: async (data) => {
        try {
            const exsisting = financialYears.find(
                fy => fy.company_id === data.company_id && 
                fy.start_date === data.start_date
            );

            if(exsisting) return { success: false, error: 'Financial year already exists' };
            const start = new Date(data.start_date);
            const end = new Date(start);
            end.setFullYear(end.getFullYear() + 1);
            end.setDate(end.getDate() - 1);

            const fy = {
                fy_id: Date.now(),
                company_id: data.company_id,
                start_date: data.start_date,
                end_date: data.end_date || end.toISOString().split('T')[0],
                is_active: false,
                is_closed: false,
                closing_date: null,
                created_at: new Date().toISOString(),
            };

            financialYears.push(fy);
            return { success: true, fy };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    getAll: async (company_id) => {
        try {
          const fys = financialYears.filter(fy => fy.company_id === company_id);
          return { success: true, financialYears: fys };
        } catch (err) {
            return { success: false, error: err.message }
        }
    },

    getById: async (id) => {
        try {
            const fy = financialYears.find(fy => fy.fy_id === id);
            if(!fy) return { success: false, error: "Financial year not found" };
            return { success: true, fy }; 
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    setActive: async ( fy_id, company_id ) => {
        try {
            const fy = financialYears.find(fy => fy.fy_id === fy_id );
            if(!fly) return { success: false, error: "Financial year not found" };
            if(fy.is_closed) return { success: false, error: " Cannot activate a closed financial year" };
            
            financialYears = financialYears.map( fy => {
                if(fy.company_id === company_id) return { ...fy, is_active: false };
                return fy;
            });

            financialYears = financialYears.map(fy => {
                if(fy.fy_id === fy_id) return { ...fy, is_active: true };
                return fy;
            });

            return { success: true };
        } catch (err) {
            return { succes: false, error: err.message };
        }
    },

    delete: async (id) => {
        try {
            const fy = financialYears.find(fy => fy.fy_id === id);
            if(!fy) return { success: false, error: "Financial year not found" };
            if(fy.is_active) return { success: false, error: "Cannot delete active financial year" };
            if(fy.is_closed) return { success: false, error: "Cannot delete closed financial year" };
            
            financialYears = financialYears.filter(fy => fy.fy_id !== id);
            return { success: true };
        } catch (err) {
            return { success:false, error: err.message };
        }
    },
};
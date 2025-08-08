const { executeQuery } = require("../helpers/db/utils/queryExecutor");

// Tüm fiyat listelerini getir
async function getAllPriceLists(req, res) {
  try {
    const { branch_id, active_only } = req.query;
    
    let query = `
      SELECT 
        pl.price_list_id,
        pl.name,
        pl.is_active,
        pl.created_at,
        pl.branch_id,
        b.name as branch_name,
        COALESCE(item_count.count, 0) as item_count
      FROM price_lists pl
      LEFT JOIN branches b ON pl.branch_id = b.branch_id
      LEFT JOIN (
        SELECT price_list_id, COUNT(*) as count
        FROM price_list_items 
        GROUP BY price_list_id
      ) item_count ON pl.price_list_id = item_count.price_list_id
    `;
    
    const conditions = [];
    const params = [];
    
    if (branch_id) {
      conditions.push(`pl.branch_id = $${params.length + 1}`);
      params.push(branch_id);
    }
    
    if (active_only === 'true') {
      conditions.push(`pl.is_active = true`);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY pl.created_at DESC`;
    
    const priceLists = await executeQuery(query, params);
    
    res.json({ success: true, data: priceLists });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: "Fiyat listeleri alınamadı", 
      error: err.message 
    });
  }
}

// Fiyat listesi detayını getir (items ile birlikte)
async function getPriceListDetails(req, res) {
  try {
    const { id } = req.params;
    
    // Fiyat listesi bilgisi
    const priceList = await executeQuery(`
      SELECT 
        pl.price_list_id,
        pl.name,
        pl.is_active,
        pl.created_at,
        pl.branch_id,
        b.name as branch_name
      FROM price_lists pl
      LEFT JOIN branches b ON pl.branch_id = b.branch_id
      WHERE pl.price_list_id = $1
    `, [id]);

    if (priceList.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Fiyat listesi bulunamadı" 
      });
    }

    // Fiyat listesi kalemleri
    const priceItems = await executeQuery(`
      SELECT 
        pli.price_list_item_id,
        pli.treatment_type_id,
        pli.base_price,
        pli.lower_jaw_price,
        pli.upper_jaw_price,
        tt.name as treatment_name,
        tt.category as treatment_category
      FROM price_list_items pli
      LEFT JOIN treatment_types tt ON pli.treatment_type_id = tt.treatment_type_id
      WHERE pli.price_list_id = $1
      ORDER BY tt.category, tt.name
    `, [id]);

    res.json({ 
      success: true, 
      data: {
        ...priceList[0],
        items: priceItems
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: "Fiyat listesi detayı alınamadı", 
      error: err.message 
    });
  }
}

// Yeni fiyat listesi oluştur
async function createPriceList(req, res) {
  try {
    const { name, branchId, isActive, items = [] } = req.body;
    
    // Validasyon
    if (!name || !branchId) {
      return res.status(400).json({ 
        success: false, 
        message: "Fiyat listesi adı ve şube zorunludur" 
      });
    }

    // Eğer aktif olacaksa, o şubedeki diğer listeleri pasif yap
    if (isActive) {
      await executeQuery(
        "UPDATE price_lists SET is_active = false WHERE branch_id = $1", 
        [branchId]
      );
    }

    // Fiyat listesi oluştur
    const newPriceList = await executeQuery(`
      INSERT INTO price_lists (name, branch_id, is_active)
      VALUES ($1, $2, $3)
      RETURNING price_list_id, name, branch_id, is_active, created_at
    `, [name, branchId, isActive || false]);

    const priceListId = newPriceList[0].price_list_id;

    // Fiyat kalemlerini kaydet
    if (items && items.length > 0) {
      for (const item of items) {
        const { treatmentTypeId, price, upperJawPrice, lowerJawPrice } = item;
        
        if (treatmentTypeId) {
          // Fiyat validasyonu - max 99,999,999.99
          const basePrice = Math.min(parseFloat(price) || 0, 99999999.99);
          const upperPrice = Math.min(parseFloat(upperJawPrice) || 0, 99999999.99);
          const lowerPrice = Math.min(parseFloat(lowerJawPrice) || 0, 99999999.99);
          
          await executeQuery(`
            INSERT INTO price_list_items (price_list_id, treatment_type_id, base_price, upper_jaw_price, lower_jaw_price)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            priceListId,
            treatmentTypeId,
            basePrice,
            upperPrice,
            lowerPrice
          ]);
        }
      }
    }

    res.status(201).json({ 
      success: true, 
      data: newPriceList[0],
      message: "Fiyat listesi başarıyla oluşturuldu" 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: "Fiyat listesi oluşturulamadı", 
      error: err.message 
    });
  }
}

// Fiyat listesini güncelle
async function updatePriceList(req, res) {
  try {
    const { id } = req.params;
    const { name, branchId, isActive, items } = req.body;
    
    // Eğer sadece aktif/deaktif işlemi yapılıyorsa (name ve branchId yok)
    if (name === undefined && branchId === undefined && isActive !== undefined) {
      // Sadece is_active alanını güncelle
      const updatedPriceList = await executeQuery(`
        UPDATE price_lists 
        SET is_active = $1
        WHERE price_list_id = $2
        RETURNING price_list_id, name, branch_id, is_active
      `, [isActive, id]);
      
      if (updatedPriceList.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: "Fiyat listesi bulunamadı" 
        });
      }

      return res.json({ 
        success: true, 
        data: updatedPriceList[0],
        message: `Fiyat listesi ${isActive ? 'aktif' : 'deaktif'} edildi` 
      });
    }
    
    // Tam güncelleme işlemi (form düzenleme)
    // Eğer aktif olacaksa, o şubedeki diğer listeleri pasif yap
    if (isActive) {
      await executeQuery(
        "UPDATE price_lists SET is_active = false WHERE branch_id = $1 AND price_list_id != $2", 
        [branchId, id]
      );
    }
    
    const updatedPriceList = await executeQuery(`
      UPDATE price_lists 
      SET 
        name = $1, 
        branch_id = $2, 
        is_active = $3
      WHERE price_list_id = $4
      RETURNING price_list_id, name, branch_id, is_active
    `, [name, branchId, isActive, id]);
    
    if (updatedPriceList.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Fiyat listesi bulunamadı" 
      });
    }

    // Eğer items array'i gönderildiyse, kalemleri güncelle
    if (items && Array.isArray(items)) {
      // Önce mevcut kalemleri sil
      await executeQuery(
        "DELETE FROM price_list_items WHERE price_list_id = $1", 
        [id]
      );

      // Yeni kalemleri ekle
      for (const item of items) {
        const { treatmentTypeId, price, upperJawPrice, lowerJawPrice } = item;
        
        if (treatmentTypeId) {
          // Fiyat validasyonu - max 99,999,999.99
          const basePrice = Math.min(parseFloat(price) || 0, 99999999.99);
          const upperPrice = Math.min(parseFloat(upperJawPrice) || 0, 99999999.99);
          const lowerPrice = Math.min(parseFloat(lowerJawPrice) || 0, 99999999.99);
          
          await executeQuery(`
            INSERT INTO price_list_items (price_list_id, treatment_type_id, base_price, upper_jaw_price, lower_jaw_price)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            id,
            treatmentTypeId,
            basePrice,
            upperPrice,
            lowerPrice
          ]);
        }
      }
    }

    res.json({ 
      success: true, 
      data: updatedPriceList[0],
      message: "Fiyat listesi başarıyla güncellendi" 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: "Fiyat listesi güncellenemedi", 
      error: err.message 
    });
  }
}

// Fiyat listesini sil
async function deletePriceList(req, res) {
  try {
    const { id } = req.params;
    
    // Önce fiyat listesi kalemlerini sil
    await executeQuery(
      "DELETE FROM price_list_items WHERE price_list_id = $1", 
      [id]
    );
    
    // Sonra fiyat listesini sil
    const result = await executeQuery(
      "DELETE FROM price_lists WHERE price_list_id = $1 RETURNING price_list_id", 
      [id]
    );
    
    if (result.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Fiyat listesi bulunamadı" 
      });
    }

    res.json({ 
      success: true, 
      message: "Fiyat listesi başarıyla silindi" 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: "Fiyat listesi silinemedi", 
      error: err.message 
    });
  }
}

// Fiyat listesinin aktif/pasif durumunu değiştir
async function togglePriceListStatus(req, res) {
  try {
    const { id } = req.params;
    
    // Önce mevcut durumu al
    const currentStatus = await executeQuery(
      "SELECT is_active, branch_id FROM price_lists WHERE price_list_id = $1", 
      [id]
    );
    
    if (currentStatus.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Fiyat listesi bulunamadı" 
      });
    }

    const newStatus = !currentStatus[0].is_active;
    
    // Eğer aktif olacaksa, o şubedeki diğer listeleri pasif yap
    if (newStatus) {
      await executeQuery(
        "UPDATE price_lists SET is_active = false WHERE branch_id = $1 AND price_list_id != $2", 
        [currentStatus[0].branch_id, id]
      );
    }
    
    // Durumu güncelle
    const updated = await executeQuery(
      "UPDATE price_lists SET is_active = $1 WHERE price_list_id = $2 RETURNING *", 
      [newStatus, id]
    );

    res.json({ 
      success: true, 
      data: updated[0],
      message: `Fiyat listesi ${newStatus ? 'aktif' : 'pasif'} hale getirildi` 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: "Fiyat listesi durumu değiştirilemedi", 
      error: err.message 
    });
  }
}

module.exports = { 
  getAllPriceLists, 
  getPriceListDetails,
  createPriceList, 
  updatePriceList, 
  deletePriceList,
  togglePriceListStatus
};

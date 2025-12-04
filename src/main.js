/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;

    const discountDecimal = discount / 100;
    const fullPrice = sale_price * quantity;
    const revenue = fullPrice * (1 - discountDecimal);
    return revenue;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;

    if (index === 0) {
        return +(profit * 0.15).toFixed(2);
    } else if (index === 1 || index === 2) {
        return +(profit * 0.10).toFixed(2);
    } else if (index === total - 1) {
        return 0;
    } else {
        return +(profit * 0.05).toFixed(2); //  исправлено
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // Проверка входных данных
    if (!data || !Array.isArray(data.purchase_records) || data.purchase_records.length === 0) {
        throw new Error('Некорректные входные данные: отсутствуют или пустые продажи');
    }

    if (!data.sellers || !Array.isArray(data.sellers) || data.sellers.length === 0) {
        throw new Error('Некорректные данные: отсутствуют или пустые продавцы');
    }

    if (!data.products || !Array.isArray(data.products) || data.products.length === 0) {
        throw new Error('Некорректные данные: отсутствуют или пустые товары');
    }

    // Проверка опций
    if (!options || typeof options !== 'object') {
        throw new Error('Опции должны быть объектом');
    }

    const { calculateRevenue, calculateBonus } = options;

    if (!calculateRevenue || typeof calculateRevenue !== 'function') {
        throw new Error('Опция calculateRevenue обязательна и должна быть функцией');
    }

    if (!calculateBonus || typeof calculateBonus !== 'function') {
        throw new Error('Опция calculateBonus обязательна и должна быть функцией');
    }

    // Подготовка промежуточных данных
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`.trim(),
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    // Индексация
    const sellerIndex = Object.fromEntries(
        sellerStats.map(item => [item.id, item]) //  исправлено: id, а не ID
    );
    const productIndex = Object.fromEntries(
        data.products.map(item => [item.sku, item])
    );

    // Расчёт выручки и прибыли
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return;

        seller.sales_count ++; // 

          seller.revenue += record.total_amount;
        
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;

            const cost = product.purchase_price * item.quantity;
            const revenue = calculateRevenue(item, product);
            const profit = revenue - cost;

            // seller.revenue += revenue;        удалено, так как выручка считается на основе total_amount
            seller.profit += profit;

            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    // Сортировка по прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);


   // Назначение бонусов и топ-10 товаров
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller); 

        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    // Формирование итогового отчёта
    return sellerStats.map(seller => ({
        seller_id: String(seller.id),
        name: String(seller.name),
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}
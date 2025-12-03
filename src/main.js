/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    // @TODO: Расчет выручки от операции
    const { discount, sale_price, quantity } = purchase;

    // Рассчитываем коэффициент для скидки
    const discountCoefficient = 1 - (discount / 100);

    // Рассчитываем выручку
    const revenue = sale_price * quantity * discountCoefficient;

    return Math.round(revenue * 100) / 100;                         // ИСПРАВЛЕНО     Округляем выручку до 2 знаков после запятой
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    // @TODO: Расчет бонуса от позиции в рейтинге
    const { profit } = seller;                                           // Получаем прибыль из карточки продавца
    let bonus = 0;                                       // Инициализируем переменную bonus

    if (index === 0) {
        bonus = profit * 0.15;
    } else if (index === 1 || index === 2) {
        bonus = profit * 0.10;
    } else if (index === total - 1) {
        bonus = 0;
    } else { // Для всех остальных
        bonus = profit * 0.05;
    }
    return Math.round(bonus * 100) / 100;                                // ИСПРАВЛЕНО     Округляем бонус до 2 знаков после запятой  
}


/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {

    // @TODO: Проверка входных данных
    const { calculateRevenue, calculateBonus } = options;
    if (
        !data.customers || !Array.isArray(data.customers) || data.customers.length === 0 ||
        !data.products || !Array.isArray(data.products) || data.products.length === 0 ||
        !data.sellers || !Array.isArray(data.sellers) || data.sellers.length === 0 ||
        !data.purchase_records || !Array.isArray(data.purchase_records) || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    // @TODO: Проверка наличия опций
    if (!calculateRevenue || !calculateBonus) {
        throw new Error('Отсутствуют необходимые функции в опциях');
    }

    // @TODO: Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map(seller => ({
                                                       // Заполним начальными данными
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    // @TODO: Индексация продавцов и товаров для быстрого доступа
                                                       // Индекс продавцов: ключом является id продавца
    const sellerIndex = data.sellers.reduce((result, seller) => ({
        ...result,
        [seller.id]: seller
    }), {});

                                                            // Индекс товаров: ключом является sku товара
    const productIndex = data.products.reduce((result, product) => ({
        ...result,
        [product.sku]: product
    }), {});

    // @TODO: Расчет выручки и прибыли для каждого продавца
    data.purchase_records.forEach(record => { // Чек
        const seller = sellerIndex[record.seller_id];                  // Продавец

        if (!seller) {
            console.warn(`Seller with id ${record.seller_id} not found.`);
            return;                                                          // Пропускаем эту запись, если продавец не найден
        }

                                                                           // Увеличить количество продаж
        seller.sales_count = (seller.sales_count || 0) + 1;

                                                                            // Увеличить общую сумму всех продаж (выручку) и общую прибыль
        record.items.forEach(item => {
            const product = productIndex[item.sku]; // Товар

            if (!product) {
                console.warn(`Product with SKU ${item.sku} not found.`);
                return;                                                    // Пропускаем этот товар, если не найден
            }

                                           // Рассчитываем выручку и прибыль для данного товара
            const revenue = calculateRevenue(item, product);
            const cost = item.quantity * product.purchase_price;
            const profit = revenue - cost;

                                               // Обновляем информацию о товарах продавца
            seller.products_sold = seller.products_sold || {};
            seller.products_sold[item.sku] = {
                name: product.name,
                quantity: (seller.products_sold[item.sku]?.quantity || 0) + item.quantity,         // ИСПРАВЛЕНО     Количество товаров в чеке за продажу 
                revenue: revenue,
                profit: profit
            };

                                              // Увеличиваем общую выручку и прибыль продавца
            seller.revenue = (seller.revenue || 0) + revenue;
            seller.profit = (seller.profit || 0) + profit;
        });
    });

    // @TODO: Сортировка продавцов по прибыли
    const sellersArray = Object.values(sellerIndex);

                                                 // Сортируем массив продавцов по убыванию прибыли (от большего к меньшему)
    sellersArray.sort((a, b) => (b.profit || 0) - (a.profit || 0));

    // @TODO: Назначение премий на основе ранжирования
    const totalSellers = sellersArray.length;
    sellersArray.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, totalSellers, seller);
    });


    // @TODO: Подготовка итоговой коллекции с нужными полями

  const report = sellersArray.map(seller => {
        // Получаем топ-10 проданных товаров продавца
        const topProducts = Object.entries(seller.products_sold || {}) // Получаем [sku, {name, quantity, revenue, profit}]
            .sort(([, a], [, b]) => b.quantity - a.quantity) // Сортируем по убыванию количества
            .slice(0, 10)         // Берем только первые 10
            .map(([sku, product]) => ({ sku: sku, quantity: product.quantity }));  // Преобразуем в нужный формат

        return {
            seller_id: seller.id,
            name: `${seller.first_name} ${seller.last_name}`,
            revenue: parseFloat((seller.revenue || 0).toFixed(2)), // Число с двумя знаками после точки, выручка продавца
            profit: parseFloat((seller.profit || 0).toFixed(2)), // Число с двумя знаками после точки, прибыль продавца
            sales_count: seller.sales_count || 0, // Целое число, количество продаж продавца
            top_products: topProducts, // Массив объектов вида: { "sku": "SKU_008","quantity": 10}, топ-10 товаров продавца
            bonus: parseFloat((seller.bonus || 0).toFixed(2))  // Число с двумя знаками после точки, бонус продавца
        };
    });

      return report;
      
}

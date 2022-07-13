// Show an item in the modal //
$('.display-item').click(function(e) {
    e.preventDefault();

    var id = $(this).attr('data-item-id'); // We get ID of the item
    var loading_html = '<div class="alert alert-info">' + LOADING_MSG + '...' + '</div>';

    $('#buy-modal .modal-body').html(loading_html); // We put the loading message in the modal
    $('#buy-modal').modal(); // We display the modal last

    $.ajax({
        url: ITEM_GET_URL + id,
        type: 'GET',
        dataType: 'json',
        success: function(response) {
            $('#buy-modal .modal-body').fadeOut(150, function() {
                if (!response.statut) $(this).html(response.html).fadeIn('250');
                $(this).html(response.html).fadeIn('250');

                var item_infos = response.item_infos;

                $.cookie.json = true; // Ability to put objects

                // If the item is already in the cart
                var itemsInCart = $.cookie('cart');
                for (var key in itemsInCart) {
                    if (itemsInCart[key] !== null && itemsInCart[key]['item_id'] == id) { // If it is already in the basket
                        $(this).find('button.add-to-cart').html(ADDED_TO_CART_MSG);
                        $(this).find('button.add-to-cart').addClass('disabled');
                        $(this).find('button.add-to-cart').attr('disabled', 'disabled');
                        break;
                    }
                }

                // Quantity
                $("input[name='quantity']").TouchSpin({
                    min: 1,
                    max: 100,
                    step: 1,
                    decimals: 0,
                    boostat: 5,
                    maxboostedstep: 10
                });
                $("input[name='quantity']").unbind('change');
                $("input[name='quantity']").on('change', function(e) {

                    var code = $('input[id="code-voucher"]').val();

                    if (code.length == 0) { // if there is no promo code
                        var new_price = item_infos['price'] * $(this).val();
                        $("#buy-modal .modal-body").find('#total-price').html(new_price);

                    } else { // if there is a promo code - we re-calculate the price according to the quantity
                        var quantity = ($(this).val() == undefined) ? 1 : $(this).val();
                        $.get(VOUCHER_CHECK_URL + code + '/' + id + '/' + quantity, function(data) {
                            if (data.price !== undefined) $("#buy-modal .modal-body").find('#total-price').html(data.price);
                        });
                    }
                });

                // Promo codes
                $('input[id="code-voucher"]').unbind('keyup');
                $('input[id="code-voucher"]').keyup(function(e) {
                    $("#buy-modal .modal-footer").find('#total-price').html('<small>' + LOADING_MSG.substr(0, 4) + '...</small>');
                    $("#buy-modal .modal-footer").find('#btn-buy').addClass('disabled').attr('disabled', true);

                    var code = $(this).val();
                    var quantity = ($("input[name='quantity']").val() == undefined) ? 1 : $("input[name='quantity']").val();
                    if (code.length > 0) {
                        $.get(VOUCHER_CHECK_URL + code + '/' + id + '/' + quantity, function(data) {
                            if (data.price !== undefined) $("#buy-modal .modal-body").find('#total-price').html(data.price);
                            $("#buy-modal .modal-footer").find('#btn-buy').removeClass('disabled').attr('disabled', false);
                        });

                    } else { // if there is no promo code
                        var new_price = item_infos['price'] * quantity;
                        $("#buy-modal .modal-body").find('#total-price').html(new_price);
                        $("#buy-modal .modal-footer").find('#btn-buy').removeClass('disabled').attr('disabled', false);
                    }
                });

                // Item purchase
                $('.buy-item').unbind('click');
                $('.buy-item').click(function(e) {
                    e.preventDefault();

                    var id = $(this).attr('data-item-id');
                    var quantity = ($("input[name='quantity']").val() == undefined) ? 1 : $("input[name='quantity']").val();
                    var code = $('#code-voucher').val();

                    if ($("#buy-modal .modal-body").find('#ajax-msg').length == 0) $("#buy-modal .modal-body").prepend('<div id="ajax-msg"></div>');

                    $('#btn-buy').attr('disabled', true);
                    $('#btn-buy').addClass('disabled');
                    $("#buy-modal .modal-body").find('#ajax-msg').html('<div class="alert alert-info">' + LOADING_MSG + '...</div>').fadeIn('150');

                    var post = {};
                    post['items'] = [{
                        item_id: id,
                        quantity: quantity
                    }];
                    post['code'] = code;
                    post["data[_Token][key]"] = CSRF_TOKEN;

                    $.ajax({
                        url: BUY_URL,
                        data: post,
                        type: 'post',
                        dataType: 'JSON',
                        success: function(response) {
                            $('#btn-buy').attr('disabled', false);
                            $('#btn-buy').removeClass('disabled');
                            $("#buy-modal .modal-body").find('#ajax-msg').html('<div class="alert alert-' + (response.statut) ? 'success' : 'danger' + '">' + response.msg + '</div>').fadeIn('150');
                        },
                        error: function(xhr) {
                            $('#btn-buy').attr('disabled', false);
                            $('#btn-buy').removeClass('disabled');
                            $("#buy-modal .modal-body").find('#ajax-msg').fadeOut(150);
                            alert('ERROR');
                        }
                    });

                });

                // Add to cart
                $('.add-to-cart').unbind('click');
                $('.add-to-cart').click(function(e) {
                    e.preventDefault();

                    var id = $(this).attr('data-item-id');
                    var cookie = $.cookie('cart');
                    var cart = (typeof(cookie) !== 'object' || cookie === undefined) ? [] : cookie;
                    var item_id = $(this).attr('data-item-id');
                    var quantity = ($("input[name='quantity']").val() == undefined) ? 1 : $("input[name='quantity']").val();
                    var item_name = item_infos['name'];
                    var item_price = item_infos['price'];

                    cart.push({
                        'item_id': item_id,
                        'quantity': quantity,
                        'item_name': item_name,
                        'item_price': item_price
                    });

                    $.cookie('cart', cart);

                    $(this).html(ADDED_TO_CART_MSG);
                    $(this).addClass('disabled');
                    $(this).attr('disabled', 'disabled');

                    refreshCart();

                });

            });
        },
        error: function(xhr) {
            console.log('Shop : We have an error with your ajax request')
            $('#buy-modal').modal('hide');
        }
    });
});

// Load my basket //
$(window).on('load', function() {
    refreshCart();

    // Buy basket //
    $('#cart-modal .modal-footer #buy-cart').click(function(e) {

        if ($("#cart-modal .modal-body").find('#ajax-msg').length == 0) $("#cart-modal .modal-body").prepend('<div id="ajax-msg"></div>');

        $('#buy-cart').attr('disabled', true);
        $('#buy-cart').addClass('disabled');

        $("#cart-modal .modal-body").find('#ajax-msg').html('<div class="alert alert-info">' + LOADING_MSG + '...</div>').fadeIn('150');

        var items = $.cookie('cart');

        var post = {};
        post['items'] = items;
        post['code'] = $('#cart-voucher').val();
        post["data[_Token][key]"] = CSRF_TOKEN;

        $.ajax({
            url: BUY_URL,
            data: post,
            type: 'post',
            dataType: 'JSON',
            success: function(response) {
                $('#buy-cart').attr('disabled', false);
                $('#buy-cart').removeClass('disabled');

                if (response.statut) {
                    $.cookie('cart', []); // We delete the basket
                    refreshCart(response.msg);
                } else {
                    $("#cart-modal .modal-body").find('#ajax-msg').html('<div class="alert alert-danger">' + response.msg + '</div>').fadeIn('150');
                }
            },
            error: function(xhr) {
                $('#buy-cart').attr('disabled', false);
                $('#buy-cart').removeClass('disabled');
                $("#cart-modal .modal-body").find('#ajax-msg').fadeOut(150);
                alert('ERROR');
            }
        });
    });
});

function refreshCart(response_msg = false) {
    $('#cart-modal .modal-body').html('<div class="alert alert-info">' + LOADING_MSG + '...</div>');

    // We open the table
    var table = '<table class="table table-bordered">';
    table += '<thead>';
    table += '<tr>';
    table += '<th>' + CART_ITEM_NAME_MSG + '</th>';
    table += '<th>' + CART_ITEM_PRICE_MSG + '</th>';
    table += '<th>' + CART_ITEM_QUANTITY_MSG + '</th>';
    table += '<th>' + CART_ACTIONS_MSG + '</th>';
    table += '</tr>';
    table += '</thead>';
    table += '<tbody>';

    // We get cookies
    $.cookie.json = true;
    var cart = $.cookie('cart');
    var notEmpty = false;
    var total = 0;

    for (var key in cart) {
        if (cart[key] !== null) {
            notEmpty = true;

            table += '<tr data-item-id="' + cart[key]['item_id'] + '">';
            table += '<td>' + cart[key]['item_name'] + '</td>';
            table += '<td>' + cart[key]['item_price'] + '</td>';
            table += '<td>' + cart[key]['quantity'] + '</td>';
            table += '<td><button class="btn btn-danger remove-from-cart" data-item-id="' + cart[key]['item_id'] + '"><i class="fa fa-close"></i></button></td>';
            table += '</tr>';

            total += parseFloat(cart[key]['item_price']) * cart[key]['quantity'];
        }
    }

    // We close the table
    table += '</tbody>';
    table += '</div>';

    if (notEmpty) {
        $('#cart-total-price').html(total.toFixed(2));
        $('#buy-cart').attr('disabled', false);
        $('#buy-cart').removeClass('disabled');
        $('#cart-modal .modal-body').html(table);
    } else {
        $('#cart-total-price').html('0');
        $('#buy-cart').attr('disabled', true);
        $('#buy-cart').addClass('disabled');
        if (response_msg === false) {
            $('#cart-modal .modal-body').html('<div class="alert alert-danger">' + CART_EMPTY_MSG + '</div>');
        } else {
            $("#cart-modal .modal-body").html('<div class="alert alert-success">' + response_msg + '</div>').fadeIn('150');
        }
    }

    // Removing an item from the cart
    $('.remove-from-cart').unbind('click');
    $('.remove-from-cart').click(function(e) {
        e.preventDefault();

        var cartContent = $.cookie('cart'); // we get the basket
        var newCart = []; // the new basket (to avoid null values)
        var item_id = $(this).attr('data-item-id');
        var total = 0;

        for (var k in cartContent) {
            if (cartContent[k] !== null && cartContent[k]['item_id'] != item_id) { // if this is not the item you are looking for
                newCart.push(cartContent[k]);
                total += parseFloat(cartContent[k]['item_price']) * cartContent[k]['quantity'];
            }
        }

        $.cookie('cart', newCart); // We put it in the cookies now

        if (newCart.length > 0) {
            $('#cart-total-price').html(total.toFixed(2));
            $('#cart-modal .modal-body').find('tr[data-item-id="' + item_id + '"]').slideUp(150); // We take it off the table
        } else {
            $('#buy-cart').attr('disabled', true);
            $('#buy-cart').addClass('disabled');
            $('#cart-total-price').html('0');
            $('#cart-modal .modal-body').html('<div class="alert alert-danger">' + CART_EMPTY_MSG + '</div>');
        }
    });

    // Promo code input
    $("input[name='cart-voucher']").unbind('keyup');
    $("input[name='cart-voucher']").on('keyup', function(e) {
        var code = $('input[name="cart-voucher"]').val();

        $("#cart-modal .modal-footer").find('#cart-total-price').html('<small>' + LOADING_MSG + '...</small>');
        $("#cart-modal .modal-footer").find('#buy-cart').addClass('disabled').attr('disabled', true);

        if (code.length == 0) { // if there is no promo code
            var cartContent = $.cookie('cart');
            var total_price = 0;
            for (var key in cartContent) total_price += cartContent[key]['item_price'] * cartContent[key]['quantity'];

            $("#cart-modal .modal-footer").find('#buy-cart').removeClass('disabled').attr('disabled', false);
            $("#cart-modal .modal-footer").find('#cart-total-price').html(total_price.toFixed(2));

        } else { // if there is a promo code - we re-calculate the price according to the quantity

            var cartContent = $.cookie('cart');
            var ids = '';
            var quantities = '';
            var i = 0;
            for (var key in cartContent) {
                i++;
                ids += cartContent[key]['item_id'];
                quantities += cartContent[key]['quantity'];
                if (i < cartContent.length) {
                    ids += ',';
                    quantities += ',';
                }
            }

            $.get(VOUCHER_CHECK_URL + code + '/' + ids + '/' + quantities, function(data) {
                if (data.price !== undefined) $("#cart-modal .modal-footer").find('#cart-total-price').html(data.price.toFixed(2));
                $("#cart-modal .modal-footer").find('#buy-cart').removeClass('disabled').attr('disabled', false);
            });
        }
    });
}

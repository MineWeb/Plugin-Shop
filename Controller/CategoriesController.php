<?php

class CategoriesController extends ShopAppController
{
    
    public function admin_index()
    {
        if ($this->isConnected AND $this->Permissions->can('SHOP__ADMIN_MANAGE_ITEMS')) {
            $this->set('title_for_layout', $this->Lang->get('SHOP__TITLE'));
            $this->layout = 'admin';
            $this->loadModel('Shop.Section');
            $search_sections = $this->Section->find('all');
            $this->loadModel('Shop.Category');
            $this->loadModel('Shop.Item');
            $search_categories = $this->Category->find('all', array('conditions' => array('section' => 1)));
            $i = 0;
            if (!empty($search_categories)) foreach ($search_categories as $v) {
                if (!$this->Section->find('first', array('conditions' => array('id' => $v['Category']['section_id'])))) {
                    $search_categories_other[$i] = $this->Category->find('all', array('conditions' => array('id' => $v['Category']['id'])));
                    if (!empty($search_categories_other)) foreach ($search_categories_other as $value) {
                        $categories_count_other[$value[0]['Category']['id']] = $this->Item->find('count', array('conditions' => array('category' => $value[0]['Category']['id'])));
                    }
                }
                $i++;
            }
            $this->loadModel('Shop.Item');
            $search_categories_no = $this->Category->find('all', array('conditions' => array('section' => 0),'order' => 'order'));
            if (!empty($search_categories_no)) foreach ($search_categories_no as $v) {
                $categories_count[$v['Category']['id']] = $this->Item->find('count', array('conditions' => array('category' => $v['Category']['id'])));
            }
            if (!empty($search_sections)) foreach ($search_sections as $va) {
                $search_categories[$va["Section"]["id"]] = $this->Category->find('all', array('conditions' => array('section_id' => $va['Section']['id'], 'section' => 1),'order' => 'order'));
                if (!empty($search_categories[$va["Section"]["id"]])) foreach ($search_categories[$va["Section"]["id"]] as $v) {
                    $categories_count[$v['Category']['id']] = $this->Item->find('count', array('conditions' => array('category' => $v['Category']['id'])));
                }
            }
            $this->set(compact('search_categories', 'categories_count', 'search_sections', 'search_categories_other', 'categories_count_other', 'search_categories_no'));
            
        }   else {
            $this->redirect('/');
        }
    }


    public function admin_edit($id = false)
    {
        if ($this->isConnected AND $this->Permissions->can('SHOP__ADMIN_MANAGE_CATEGORIES')) {

            $this->layout = 'admin';
            $this->set('title_for_layout', $this->Lang->get('SHOP__CATEGORY_EDIT'));
            $this->loadModel('Shop.Category');
            $category = $this->Category->find('first', array('conditions' => array('id' => $id)));
            $this->loadModel('Shop.Section');
            $this->loadModel('Shop.Item');
            $search_sections = $this->Section->find('all');
            if (!empty($search_categories)) foreach ($search_categories as $v) {
                $categories_count[$v['Category']['id']] = $this->Item->find('count', array('conditions' => array('category' => $v['Category']['id'])));
            }
            $this->set(compact('category', 'search_sections'));

            if ($this->request->is('post')) {
                $section = !$this->request->data['section'] || !empty($this->request->data['section_id']);
                if (!empty($this->request->data['name']) AND $section) {

                    if (!$this->request->data['section']) $this->request->data['section_id'] = 0;

                    $this->Category->read(null, $id);
                    $this->Category->set(array(
                        'name' => $this->request->data['name'],
                        'section' => $this->request->data['section'],
                        'section_id' => $this->request->data['section_id']
                    ));
                    $this->History->set('ADD_CATEGORY', 'shop');
                    $this->Category->save();
                    $this->Session->setFlash($this->Lang->get('SHOP__CATEGORY_EDIT_SUCCESS'), 'default.success');
                    $this->redirect(array('controller' => 'categories', 'action' => 'index', 'admin' => true));

                } else {
                    $this->Session->setFlash($this->Lang->get('ERROR__FILL_ALL_FIELDS'), 'default.error');
                }
            }
        } else {
            $this->redirect('/');
        }
    }

    public function admin_edit_section()
    {
        $this->autoRender = false;
        $this->response->type('json');
        if ($this->isConnected AND $this->Permissions->can('SHOP__ADMIN_MANAGE_CATEGORIES')) {
            if ($this->request->is('post')) {
                if (!empty($this->request->data['name'])) {
                    $this->loadModel('Shop.Section');
                    $this->Section->read(null, $this->request->data['id']);
                    $this->Section->set(array(
                        'name' => $this->request->data['name'],
                    ));
                    $this->Section->save();
                    $this->response->body(json_encode(array('statut' => true, 'msg' => $this->Lang->get('SHOP__SECTION_EDIT_SUCCESS'))));
                } else {
                    $this->response->body(json_encode(array('statut' => false, 'msg' => $this->Lang->get('ERROR__FILL_ALL_FIELDS'))));
                }
            } else {
                $this->response->body(json_encode(array('statut' => false, 'msg' => $this->Lang->get('ERROR__BAD_REQUEST'))));
            }
        } else {
            throw new ForbiddenException();
        }
    }
    

    public function admin_save_ajax()
    {
        $this->autoRender = false;
        $this->response->type('json');
        if ($this->isConnected AND $this->Permissions->can('SHOP__ADMIN_MANAGE_CATEGORIES')) {

            if ($this->request->is('post')) {
                if (!empty($this->request->data)) {
                    $data = $this->request->data['shop_item_order'];
                    $data = explode('&', $data);
                    $i = 1;
                    foreach ($data as $key => $value) {
                        $data2[] = explode('=', $value);
                        $data3 = substr($data2[0][0], 0, -2);
                        $data1[$data3] = $i;
                        unset($data3);
                        unset($data2);
                        $i++;
                    }
                    $data = $data1;
                    $this->loadModel('Shop.Category');
                    foreach ($data as $key => $value) {
                        $find = $this->Category->find('first', array('conditions' => array('id' => $key)));
                        if (!empty($find)) {
                            $id = $find['Category']['id'];
                            $this->Category->read(null, $id);
                            $this->Category->set(array(
                                'order' => $value,
                            ));
                            $this->Category->save();
                        } else {
                            $error = 1;
                        }
                    }
                    if (empty($error)) {
                        return $this->response->body(json_encode(array('statut' => true, 'msg' => $this->Lang->get('SHOP__SAVE_SUCCESS'))));
					} else{
                        return $this->response->body(json_encode(array('statut' => false, 'msg' => $this->Lang->get('ERROR__FILL_ALL_FIELDS'))));
                    }
                } else {
                    return $this->response->body(json_encode(array('statut' => false, 'msg' => $this->Lang->get('ERROR__FILL_ALL_FIELDS'))));
                }
            } else {
                return $this->response->body(json_encode(array('statut' => false, 'msg' => $this->Lang->get('ERROR__BAD_REQUEST'))));
            }
        } else {
            $this->redirect('/');
        }
    }
    
    /*
    * ======== Ajout d'une catégorie (affichage & traitement POST) ===========
    */

    public function admin_add_category($section_id = null)
    {
        if ($this->isConnected AND $this->Permissions->can('SHOP__ADMIN_MANAGE_CATEGORIES')) {

            $this->layout = 'admin';
            $this->set('title_for_layout', $this->Lang->get('SHOP__CATEGORY_ADD'));
            $this->loadModel('Shop.Section');
            $search_sections = $this->Section->find('all');
            $this->set(compact('search_sections', 'section_id'));

            if ($this->request->is('post')) {
                $section = !$this->request->data['section'] || !empty($this->request->data['section_id']);
                if (!empty($this->request->data['name']) AND $section) {

                    $this->loadModel('Shop.Category');
                    if (!$this->request->data['section']) $this->request->data['section_id'] = 0;

                    $this->Category->read(null, null);
                    $this->Category->set(array(
                        'name' => $this->request->data['name'],
                        'section' => $this->request->data['section'],
                        'section_id' => $this->request->data['section_id']
                    ));
                    $this->History->set('ADD_CATEGORY', 'shop');
                    $this->Category->save();
                    $this->Session->setFlash($this->Lang->get('SHOP__CATEGORY_ADD_SUCCESS'), 'default.success');
                    $this->redirect(array('controller' => 'categories', 'action' => 'index', 'admin' => true));

                } else {
                    $this->Session->setFlash($this->Lang->get('ERROR__FILL_ALL_FIELDS'), 'default.error');
                }
            }
        } else {
            $this->redirect('/');
        }
    }
    
    /*
    * ======== Ajout d'une catégorie (affichage & traitement POST) ===========
    */
    
    public function admin_add_section()
    {
        if ($this->isConnected AND $this->Permissions->can('SHOP__ADMIN_MANAGE_CATEGORIES')) {

            $this->layout = 'admin';
            $this->set('title_for_layout', $this->Lang->get('SHOP__CATEGORY_ADD'));
            if ($this->request->is('post')) {
                if (!empty($this->request->data['name'])) {
                    $this->loadModel('Shop.Section');

                    $event = new CakeEvent('beforeAddCategory', $this, array('section' => $this->request->data['name'], 'user' => $this->User->getAllFromCurrentUser()));
                    $this->getEventManager()->dispatch($event);
                    if ($event->isStopped()) {
                        return $event->result;
                    }

                    $this->Section->read(null, null);
                    $this->Section->set(array(
                        'name' => $this->request->data['name']
                    ));
                    $this->History->set('ADD_SECTION', 'shop');
                    $this->Section->save();
                    $this->Session->setFlash($this->Lang->get('SHOP__SECTION_ADD_SUCCESS'), 'default.success');
                    $this->redirect(array('controller' => 'categories', 'action' => 'index', 'admin' => true));
                } else {
                    $this->Session->setFlash($this->Lang->get('ERROR__FILL_ALL_FIELDS'), 'default.error');
                }
            }
        } else {
            $this->redirect('/');
        }
    }
    
    
}

﻿angular.module('virtoCommerce.catalogModule')
.controller('virtoCommerce.catalogModule.newProductWizardImagesController', ['$scope', '$filter', 'platformWebApp.bladeNavigationService', 'FileUploader', 'platformWebApp.assets.api', 'virtoCommerce.catalogModule.imageTools', 'platformWebApp.settings', function ($scope, $filter, bladeNavigationService, FileUploader, assets, imageTools, settings) {
    var blade = $scope.blade;
    blade.hasAssetCreatePermission = bladeNavigationService.checkPermission('platform:asset:create');

    blade.currentEntity = angular.copy(blade.item);
    if (!blade.currentEntity.images) {
        blade.currentEntity.images = [];
    }
    blade.isLoading = false;

    $scope.addImageFromUrl = function () {
        if (blade.newExternalImageUrl) {
            assets.uploadFromUrl({ folderUrl: getImageUrl().folderUrl, url: blade.newExternalImageUrl }, function (data) {
                blade.currentEntity.images.push(data);
                blade.newExternalImageUrl = undefined;
            });
        }
    };

    $scope.saveChanges = function () {
        blade.parentBlade.item.images = blade.currentEntity.images;
        $scope.bladeClose();
    };

    function initialize() {
        if (!$scope.uploader && blade.hasAssetCreatePermission) {
            // create the uploader
            var uploader = $scope.uploader = new FileUploader({
                scope: $scope,
                headers: { Accept: 'application/json' },
                url: getImageUrl().relative,
                autoUpload: true,
                removeAfterUpload: true
            });

            // ADDING FILTERS
            // Images only
            uploader.filters.push({
                name: 'imageFilter',
                fn: function (i /*{File|FileLikeObject}*/, options) {
                    var type = '|' + i.type.slice(i.type.lastIndexOf('/') + 1) + '|';
                    return '|jpg|png|jpeg|bmp|gif|'.indexOf(type) !== -1;
                }
            });

            uploader.onSuccessItem = function (fileItem, images, status, headers) {
                angular.forEach(images, function (image) {
                    //ADD uploaded image to the item
                    blade.currentEntity.images.push(image);
                    var request = { imageUrl: image.url, isRegenerateAll: true };
                    
                    imageTools.generateThumbnails(request, function (response) {
                        if (!response || response.error) {
                            bladeNavigationService.setError(response.error, blade);
                        }
                    });
                });
            };

            uploader.onAfterAddingAll = function (addedItems) {
                bladeNavigationService.setError(null, blade);
            };

            uploader.onErrorItem = function (item, response, status, headers) {
                bladeNavigationService.setError(item._file.name + ' failed: ' + (response.message ? response.message : status), blade);
            };
        }
    };

    $scope.toggleImageSelect = function (e, image) {
        if (e.ctrlKey == 1) {
            image.$selected = !image.$selected;
        } else {
            angular.forEach(blade.currentEntity.images, function (i) {
                i.$selected = false;
            });
            image.$selected = true;
        }
    }

    $scope.removeAction = function (selectedImages) {
        if (selectedImages == undefined) {
            selectedImages = $filter('filter')(blade.currentEntity.images, { $selected: true });
        }

        angular.forEach(selectedImages, function (image) {
            var idx = blade.currentEntity.images.indexOf(image);
            if (idx >= 0) {
                blade.currentEntity.images.splice(idx, 1);
            }
        });
    };

    blade.toolbarCommands = [
		{
		    name: "platform.commands.remove", icon: 'fa fa-trash-o', executeMethod: function () { $scope.removeAction(); },
		    canExecuteMethod: function () {
		        var selectedImages = $filter('filter')(blade.currentEntity.images, { $selected: true });
		        return selectedImages.length > 0;
		    }
		}
    ];

    $scope.sortableOptions = {
        update: function (e, ui) {
        },
        stop: function (e, ui) {
        }
    };

    $scope.changeImageCategory = function ($item, $model) {
        $scope.uploader.url = getImageUrl().relative;
    };

    function getImageUrl() {
        var folderUrl = 'catalog/' + blade.item.code + (blade.imageType ? '/' + blade.imageType : '');
        return { folderUrl: '/' + folderUrl, relative: 'api/platform/assets?folderUrl=' + folderUrl };
    };

    $scope.imageTypes = settings.getValues({ id: 'Catalog.ImageCategories' });

    initialize();
}]);
